import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Star, 
  Trash2, 
  AlertCircle, 
  Plus, 
  Link as LinkIcon, 
  Eye, 
  Loader2,
  CheckCircle2,
  X,
  FileCheck2,
  Sparkles,
  Zap,
  RotateCcw,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { 
  uploadProductImage, 
  fileToDataUrl,
  UploadedImageResult 
} from '../../services/storageService';
import { compressImage } from '../../utils/imageCompressor';

const MAX_PRODUCT_IMAGES = 10;

interface ProductImageUploaderProps {
  productId: string;
  mainImage: string;
  gallery: string[];
  onChange: (mainImage: string, gallery: string[]) => void;
  disabled?: boolean;
  language?: 'en' | 'bn';
}

interface UploadingFileState {
  id: string;
  file: File;
  fileName: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'stalled_fallback' | 'completed' | 'failed';
  statusMessage?: string;
  originalSizeKB: number;
  compressedSizeKB?: number;
  error?: string;
  uploadedUrl?: string;
  isOfflineFallback?: boolean;
}

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  productId,
  mainImage,
  gallery = [],
  onChange,
  disabled = false,
  language = 'en',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Ref tracks latest images synchronously so parallel batch uploads (up to 10 files) never overwrite each other
  const latestImagesRef = useRef<{ mainImage: string; gallery: string[] }>({
    mainImage,
    gallery,
  });

  useEffect(() => {
    latestImagesRef.current = { mainImage, gallery };
  }, [mainImage, gallery]);

  // Clean up any pending abort controllers on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Consolidate all image items in display order: Cover Photo first, followed by Gallery Images
  const allImages = React.useMemo(() => {
    const list: Array<{ url: string; isMain: boolean; index: number }> = [];
    if (mainImage) {
      list.push({ url: mainImage, isMain: true, index: 0 });
    }
    gallery.forEach((url) => {
      if (url && url !== mainImage && !list.some((item) => item.url === url)) {
        list.push({ url, isMain: false, index: list.length });
      }
    });
    return list;
  }, [mainImage, gallery]);

  const currentCount = allImages.length;
  const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - currentCount);

  // Handle tagging an image as the primary Cover Photo (rest become Gallery Images)
  const handleSetAsMain = (selectedUrl: string) => {
    if (!selectedUrl || selectedUrl === mainImage) return;

    const current = latestImagesRef.current;
    const otherUrls = [current.mainImage, ...current.gallery].filter(
      (u, idx, arr) => Boolean(u) && u !== selectedUrl && arr.indexOf(u) === idx
    );

    latestImagesRef.current = { mainImage: selectedUrl, gallery: otherUrls };
    onChange(selectedUrl, otherUrls);
    setInfoMessage(
      language === 'bn'
        ? 'প্রধান কভার ফটো আপডেট করা হয়েছে। বাকিগুলো গ্যালারি ইমেজ হিসেবে থাকবে।'
        : 'Cover Photo updated! Remaining visuals are organized as Gallery Images.'
    );
  };

  // Handle removing an image
  const handleRemoveImage = (urlToRemove: string) => {
    const current = latestImagesRef.current;
    const uniqueOthers = [current.mainImage, ...current.gallery].filter(
      (u, idx, arr) => Boolean(u) && u !== urlToRemove && arr.indexOf(u) === idx
    );

    if (uniqueOthers.length > 0) {
      const nextMain = urlToRemove === current.mainImage ? uniqueOthers[0] : current.mainImage;
      const nextGallery = uniqueOthers.filter((u) => u !== nextMain);
      latestImagesRef.current = { mainImage: nextMain, gallery: nextGallery };
      onChange(nextMain, nextGallery);
    } else {
      latestImagesRef.current = { mainImage: '', gallery: [] };
      onChange('', []);
    }
  };

  // Explicit user cancellation handler
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadingFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMessage(
      language === 'bn' 
        ? 'ছবি আপলোড বাতিল করা হয়েছে।' 
        : 'Image upload was cancelled by user.'
    );
  };

  // Synchronous ref-backed append so concurrent uploads never race or drop URLs
  const appendUploadedUrls = useCallback((newUrls: string[]) => {
    const valid = newUrls.map((u) => u.trim()).filter(Boolean);
    if (valid.length === 0) return;

    const current = latestImagesRef.current;
    let nextMain = current.mainImage;
    const gallerySet = new Set(
      current.gallery.filter((u) => Boolean(u) && u !== nextMain)
    );

    for (const url of valid) {
      const totalSoFar = (nextMain ? 1 : 0) + gallerySet.size;
      if (totalSoFar >= MAX_PRODUCT_IMAGES) break;
      if (!nextMain) {
        nextMain = url;
      } else if (url !== nextMain) {
        gallerySet.add(url);
      }
    }

    const nextGallery = Array.from(gallerySet);
    latestImagesRef.current = { mainImage: nextMain, gallery: nextGallery };
    onChange(nextMain, nextGallery);
  }, [onChange]);

  const appendUploadedUrl = useCallback((newUrl: string) => {
    appendUploadedUrls([newUrl]);
  }, [appendUploadedUrls]);

  // Upload or retry a single file with stall-detection and atomic fallback
  const uploadSingleFile = useCallback(async (
    itemState: UploadingFileState, 
    signal: AbortSignal,
    options?: { forceAtomic?: boolean }
  ): Promise<UploadedImageResult | null> => {
    const fileId = itemState.id;
    const rawFile = itemState.file;

    try {
      // Step A: Client-side compression
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === fileId 
            ? { 
                ...item, 
                status: 'compressing', 
                progress: 25, 
                statusMessage: language === 'bn' ? 'ছবি কম্প্রেশন করা হচ্ছে...' : 'Compressing locally...' 
              } 
            : item
        )
      );

      let optimizedFile: File = rawFile;
      try {
        optimizedFile = await compressImage(rawFile, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.82,
          targetMimeType: 'image/webp',
        });
      } catch (compErr) {
        console.warn('[ProductImageUploader] Client compression skipped, using raw file:', compErr);
      }

      if (signal.aborted) throw new Error('Upload cancelled');

      const compKB = Math.round(optimizedFile.size / 1024);
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === fileId
            ? {
                ...item,
                status: 'uploading',
                compressedSizeKB: compKB,
                progress: 40,
                statusMessage: language === 'bn' ? 'ক্লাউড স্টোরেজে আপলোড হচ্ছে...' : 'Uploading to cloud storage...',
              }
            : item
        )
      );

      // Step B: Upload to Firebase Storage with stall-watcher and atomic fallback
      const result = await uploadProductImage(
        optimizedFile,
        productId,
        (progress, stateInfo) => {
          setUploadingFiles((prev) =>
            prev.map((item) =>
              item.id === fileId
                ? {
                    ...item,
                    progress: Math.max(item.progress, progress),
                    statusMessage: stateInfo?.statusText || (
                      language === 'bn' ? `আপলোড হচ্ছে (${progress}%)...` : `Uploading (${progress}%)...`
                    )
                  }
                : item
            )
          );
        },
        {
          signal,
          timeoutMs: 7500,
          allowFallbackToDataUrl: true,
          onStatusChange: (status, message) => {
            setUploadingFiles((prev) =>
              prev.map((item) => {
                if (item.id !== fileId) return item;
                if (status === 'stalled_fallback') {
                  return {
                    ...item,
                    status: 'stalled_fallback',
                    statusMessage: language === 'bn' 
                      ? 'নেটওয়ার্ক ড্রপ সনাক্ত হয়েছে, দ্রুত কম্প্রেশন মোডে সংরক্ষণ করা হচ্ছে...'
                      : 'Stream delayed. Saving in instant optimized mode...',
                  };
                }
                return item;
              })
            );
          },
        }
      );

      // Step C: Mark completed immediately, stop spinner instantly & notify
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === fileId
            ? {
                ...item,
                status: 'completed' as const,
                progress: 100,
                uploadedUrl: result.url,
                isOfflineFallback: result.isOfflineFallback,
                statusMessage: result.isOfflineFallback
                  ? (language === 'bn' ? '✓ কম্প্রেসড মোডে সংরক্ষিত (১০০%)' : '✓ Stored via optimized compression (100%)')
                  : (language === 'bn' ? '✓ আপলোড ১০০% সম্পন্ন!' : '✓ Upload 100% Complete!'),
              }
            : item
        )
      );

      appendUploadedUrl(result.url);

      // Trigger instant success toast notification
      setInfoMessage(
        language === 'bn'
          ? `✓ "${itemState.fileName}" সফলভাবে ১০০% আপলোড সম্পন্ন হয়েছে!`
          : `✓ "${itemState.fileName}" uploaded successfully (100% complete)!`
      );

      return result;
    } catch (err: any) {
      if (err?.message === 'Upload cancelled' || err?.message === 'Upload cancelled by user.') {
        return null;
      }
      console.error(`Upload error for file ${itemState.fileName}:`, err);
      const userErr = err?.message || (language === 'bn' ? 'আপলোড ব্যাহত হয়েছে।' : 'Upload stalled or failed.');
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === fileId
            ? {
                ...item,
                status: 'failed',
                error: userErr,
                statusMessage: userErr,
              }
            : item
        )
      );
      return null;
    }
  }, [productId, language, appendUploadedUrl]);

  // Retry an individual failed file
  const handleRetryFile = async (fileId: string) => {
    const item = uploadingFiles.find((f) => f.id === fileId);
    if (!item) return;

    if (abortControllerRef.current?.signal.aborted) {
      abortControllerRef.current = new AbortController();
    }
    const currentSignal = abortControllerRef.current?.signal || new AbortController().signal;

    setErrorMessage(null);
    setIsUploading(true);

    try {
      await uploadSingleFile(item, currentSignal);
    } finally {
      setIsUploading(false);
    }
  };

  // Save an individual failed file as compressed local WebP Data URL fallback
  const handleSaveOfflineFallback = async (fileId: string) => {
    const item = uploadingFiles.find((f) => f.id === fileId);
    if (!item) return;

    try {
      const optimized = await compressImage(item.file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.82,
        targetMimeType: 'image/webp',
      });
      const dataUrl = await fileToDataUrl(optimized);
      
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                uploadedUrl: dataUrl,
                isOfflineFallback: true,
                statusMessage: language === 'bn' ? 'অফলাইন মোডে সংরক্ষিত হয়েছে' : 'Saved in offline mode',
                error: undefined,
              }
            : f
        )
      );

      appendUploadedUrl(dataUrl);
      setInfoMessage(
        language === 'bn'
          ? 'ছবিটি সফলভাবে অপ্টিমাইজ করে সংরক্ষণ করা হয়েছে।'
          : 'Image saved successfully in compressed mode.'
      );
    } catch (fallbackErr: any) {
      setErrorMessage(language === 'bn' ? 'অফলাইন প্রসেসিং ব্যর্থ হয়েছে।' : 'Offline processing failed.');
    }
  };

  // Remove a failed item from the uploading list
  const handleDismissFailedUpload = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((item) => item.id !== fileId));
  };

  // Process and upload file list with client-side compression, 5-image restriction & timeout
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const rawFiles = Array.from(files);
    if (rawFiles.length === 0) return;

    setErrorMessage(null);
    setInfoMessage(null);

    // Rule 1: Limit maximum product images allowed to upload at once (max 5)
    if (remainingSlots <= 0) {
      setErrorMessage(
        language === 'bn'
          ? `সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবি ইতিমধ্যে যুক্ত রয়েছে। নতুন ছবি যোগ করার পূর্বে কোনো একটি ছবি মুছে ফেলুন।`
          : `Maximum limit of ${MAX_PRODUCT_IMAGES} images reached. Please delete an existing image to upload more.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    let filesToProcess = rawFiles;
    if (filesToProcess.length > remainingSlots) {
      filesToProcess = rawFiles.slice(0, remainingSlots);
      setInfoMessage(
        language === 'bn'
          ? `সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবির সীমা অনুযায়ী কেবল প্রথম ${remainingSlots}টি ছবি নেওয়া হয়েছে।`
          : `Restricted to ${remainingSlots} available slot(s). Only the first ${remainingSlots} image(s) are being processed.`
      );
    }

    // Validate image MIME types
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const invalidFiles = filesToProcess.filter(
      (f) => !validExtensions.includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|webp)$/i)
    );

    if (invalidFiles.length > 0) {
      setErrorMessage(
        language === 'bn' 
          ? 'শুধুমাত্র JPG, PNG বা WebP ফরম্যাটের ছবি আপলোড করুন।' 
          : 'Please select valid image files (.jpg, .png, .webp).'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsUploading(true);

    const initialUploadState: UploadingFileState[] = filesToProcess.map((file, idx) => ({
      id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      file,
      fileName: file.name,
      progress: 15,
      status: 'compressing',
      statusMessage: language === 'bn' ? 'কম্প্রেশন প্রস্তুত হচ্ছে...' : 'Preparing compression...',
      originalSizeKB: Math.round(file.size / 1024),
    }));

    setUploadingFiles(initialUploadState);

    try {
      const uploadPromises = initialUploadState.map((stateItem) => {
        return uploadSingleFile(stateItem, abortController.signal);
      });

      const results = await Promise.all(uploadPromises);
      const successfulCount = results.filter(Boolean).length;

      if (successfulCount > 0) {
        setInfoMessage(
          language === 'bn'
            ? `সফলভাবে ${successfulCount}টি ছবি প্রসেস ও আপলোড করা হয়েছে!`
            : `Successfully processed & added ${successfulCount} image(s)!`
        );
      }
    } catch (err: any) {
      if (err?.message !== 'Upload cancelled' && err?.message !== 'Upload cancelled by user.') {
        console.error('Batch upload error:', err);
      }
    } finally {
      // Instantly reset uploading spinner so the UI is never stuck or blocked
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [remainingSlots, language, uploadSingleFile]);

  // Drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && remainingSlots > 0 && !isUploading) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && remainingSlots > 0 && !isUploading) setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Manual Single or Bulk URL Add handler (1 URL per line or comma-separated)
  const handleAddUrl = () => {
    const rawLines = urlInput
      .split(/[\r\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (rawLines.length === 0) return;

    if (remainingSlots <= 0) {
      setErrorMessage(
        language === 'bn'
          ? `সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবি ইতিমধ্যে যুক্ত রয়েছে।`
          : `Maximum ${MAX_PRODUCT_IMAGES} images limit reached.`
      );
      return;
    }

    const validUrls = rawLines.filter(
      (u) => u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')
    );

    if (validUrls.length === 0) {
      setErrorMessage(
        language === 'bn'
          ? 'সঠিক ইমেজ URL দিন (https:// দিয়ে শুরু)'
          : 'Please enter valid HTTP/HTTPS image URLs'
      );
      return;
    }

    setErrorMessage(null);
    const urlsToAdd = validUrls.slice(0, remainingSlots);
    appendUploadedUrls(urlsToAdd);
    setUrlInput('');
    setShowUrlInput(false);
    setInfoMessage(
      language === 'bn'
        ? `${urlsToAdd.length}টি ছবির URL গ্যালারিতে যুক্ত হয়েছে!`
        : `Added ${urlsToAdd.length} image URL(s) to product gallery!`
    );
  };

  return (
    <div id="product-image-uploader" className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
            {language === 'bn'
              ? `একাধিক পণ্যের ছবি (সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি) ও কভার ফটো নির্বাচন *`
              : `Multi-Image Gallery (Up to ${MAX_PRODUCT_IMAGES}) & Cover Selection *`}
          </label>
          <span className="text-[11px] text-gray-400">
            {language === 'bn' 
              ? `একসাথে সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবি আপলোড করুন এবং যেকোনোটিতে ক্লিক করে কভার ফটো হিসেবে ট্যাগ করুন।` 
              : `Upload up to ${MAX_PRODUCT_IMAGES} images at once. Click any image to tag it as Cover Photo; the rest stay as Gallery Images.`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Image Count Badge */}
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
            currentCount >= MAX_PRODUCT_IMAGES
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
          }`}>
            {currentCount} / {MAX_PRODUCT_IMAGES} {language === 'bn' ? 'টি ছবি' : 'Images'}
          </span>

          {remainingSlots > 0 && (
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono cursor-pointer px-2 py-1 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{showUrlInput ? (language === 'bn' ? 'লুকান' : 'Hide URLs') : (language === 'bn' ? 'বাল্ক URL যোগ' : 'Paste Image URLs')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Single or Bulk Direct URL Input field */}
      {showUrlInput && remainingSlots > 0 && (
        <div className="p-3 rounded-xl bg-[#181A22] border border-[#D4AF37]/30 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>
              {language === 'bn'
                ? `প্রতি লাইনে ১টি করে ইমেজ URL পেস্ট করুন (বাকি স্লট: ${remainingSlots})`
                : `Paste 1 or multiple image URLs (one per line, up to ${remainingSlots} slots left)`}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <textarea
              rows={2}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={"https://images.unsplash.com/photo-1...\nhttps://images.unsplash.com/photo-2..."}
              className="flex-1 bg-[#12141A] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:brightness-110 cursor-pointer shrink-0 min-h-[38px]"
            >
              {language === 'bn' ? 'সবগুলো যোগ করুন' : 'Add Image(s)'}
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading && remainingSlots > 0) {
            fileInputRef.current?.click();
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center gap-3 ${
          remainingSlots <= 0 
            ? 'border-white/10 bg-[#12141A]/50 opacity-70 cursor-not-allowed'
            : isDragOver
              ? 'border-[#D4AF37] bg-[#D4AF37]/10 scale-[1.01] cursor-pointer'
              : 'border-white/15 bg-[#14151D] hover:border-[#D4AF37]/50 hover:bg-[#181A24] cursor-pointer'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
          disabled={disabled || isUploading || remainingSlots <= 0}
        />

        {isUploading ? (
          <div className="space-y-4 w-full max-w-md py-2">
            <div className="flex items-center justify-center gap-2 text-[#D4AF37]">
              <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
              <span className="text-xs font-bold text-white">
                {language === 'bn' 
                  ? `ছবি আপলোড ও পর্যবেক্ষণ চলছে (${uploadingFiles.filter(f => f.status !== 'completed').length} টি)...` 
                  : `Uploading & Monitoring (${uploadingFiles.filter(f => f.status !== 'completed').length} remaining)...`}
              </span>
            </div>

            {/* Per-file progress list */}
            <div className="space-y-2.5 pt-1 text-left">
              {uploadingFiles.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                    item.status === 'failed'
                      ? 'bg-red-950/30 border-red-500/40'
                      : item.status === 'stalled_fallback'
                        ? 'bg-amber-950/30 border-amber-500/40 animate-pulse'
                        : item.status === 'completed'
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-[#0F1015] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-200">
                    <span className="truncate max-w-[200px] font-mono text-[11px] font-semibold">{item.fileName}</span>
                    <span className="text-[11px] font-mono font-bold">
                      {item.status === 'compressing' && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Zap className="w-3 h-3 animate-pulse" /> Compressing...
                        </span>
                      )}
                      {item.status === 'stalled_fallback' && (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 animate-spin" /> Auto-Switching...
                        </span>
                      )}
                      {item.status === 'uploading' && (
                        <span className="text-[#D4AF37]">{item.progress}%</span>
                      )}
                      {item.status === 'completed' && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100%
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Size info */}
                  {item.compressedSizeKB && (
                    <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span>{item.originalSizeKB} KB → {item.compressedSizeKB} KB</span>
                      <span className="text-emerald-400 font-bold">
                        ({Math.round((1 - item.compressedSizeKB / item.originalSizeKB) * 100)}% saved)
                      </span>
                    </div>
                  )}

                  {/* Status explanation */}
                  {item.statusMessage && (
                    <p className={`text-[10px] font-mono ${
                      item.status === 'failed' ? 'text-red-300' : item.status === 'stalled_fallback' ? 'text-amber-300' : 'text-gray-400'
                    }`}>
                      {item.statusMessage}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        item.status === 'failed' 
                          ? 'bg-red-500' 
                          : item.status === 'stalled_fallback'
                            ? 'bg-amber-400'
                            : item.status === 'completed'
                              ? 'bg-emerald-400'
                              : 'bg-[#D4AF37]'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  {/* Action buttons if file stalled or failed */}
                  {item.status === 'failed' && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryFile(item.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#D4AF37] hover:bg-[#c4a130] text-black text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{language === 'bn' ? 'পুনরায় চেষ্টা (Retry)' : 'Retry Upload'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveOfflineFallback(item.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-[10px] font-semibold flex items-center gap-1 border border-blue-500/30 transition-all cursor-pointer"
                        title="Save as client compressed image to bypass network issues"
                      >
                        <WifiOff className="w-3 h-3" />
                        <span>{language === 'bn' ? 'অফলাইন সেভ' : 'Save Offline'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissFailedUpload(item.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-white ml-auto"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Global Cancel Button */}
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelUpload();
                }}
                className="px-4 py-2 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সব আপলোড বাতিল করুন (Cancel All)' : 'Cancel Upload'}</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-mono text-center">
              Direct atomic upload active (Auto-recovers hanging connections)
            </p>
          </div>
        ) : remainingSlots <= 0 ? (
          /* Reached Max Limit UI */
          <div className="space-y-2 py-2">
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto w-fit">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-white">
                {language === 'bn'
                  ? `সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবি যুক্ত রয়েছে`
                  : `Maximum ${MAX_PRODUCT_IMAGES} Images Reached`}
              </p>
              <p className="text-[11px] text-gray-400">
                {language === 'bn' 
                  ? 'নতুন ছবি আপলোড করতে নিচের তালিকা থেকে কোনো ছবি মুছে ফেলুন।' 
                  : 'To upload a new image, delete one from the gallery below first.'}
              </p>
            </div>
          </div>
        ) : (
          /* Normal Upload Dropzone UI */
          <>
            <div className="p-3.5 rounded-full bg-[#1F222E] border border-white/10 text-[#D4AF37] shadow-inner group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-white">
                {language === 'bn' ? (
                  <>একসাথে একাধিক ছবি টেনে আনুন অথবা <span className="text-[#D4AF37] underline underline-offset-2">ফাইল ব্রাউজ করুন</span></>
                ) : (
                  <>Drag & drop multiple product images here, or <span className="text-[#D4AF37] underline underline-offset-2">Select Files</span></>
                )}
              </p>
              <p className="text-[11px] text-gray-400 font-mono">
                PNG, JPG, WEBP • Up to {MAX_PRODUCT_IMAGES} images • Remaining slots: {remainingSlots}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Auto-Compression
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
                Up to {MAX_PRODUCT_IMAGES} Images
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-1">
                <CloudUpload className="w-3 h-3" /> Multi-File Upload
              </span>
            </div>
          </>
        )}
      </div>

      {/* Success confirmation toast */}
      {infoMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/40 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-emerald-300">
                {language === 'bn' ? 'সফল বার্তা' : 'Upload Success'}
              </p>
              <p className="text-[11px] text-emerald-200/90 font-mono">{infoMessage}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setInfoMessage(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error message alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Thumbnail Previews Grid */}
      {allImages.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span className="font-mono">
              {allImages.length} / {MAX_PRODUCT_IMAGES} {language === 'bn' ? 'টি ছবি' : 'Images'}
              {mainImage ? ` • 1 Cover Photo + ${Math.max(0, allImages.length - 1)} Gallery` : ''}
            </span>
            <span className="text-[11px] text-[#D4AF37]/90">
              {language === 'bn'
                ? 'কভার ফটো পরিবর্তন করতে যেকোনো ছবিতে ক্লিক করুন'
                : 'Click any image card to set it as the Cover Photo'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {allImages.map((item, idx) => (
              <div
                key={item.url + idx}
                onClick={() => {
                  if (!item.isMain) handleSetAsMain(item.url);
                }}
                className={`group flex flex-col rounded-xl overflow-hidden border-2 transition-all bg-[#0F1015] shadow-lg ${
                  item.isMain
                    ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-[#D4AF37]/15'
                    : 'border-white/10 hover:border-[#D4AF37]/60 cursor-pointer'
                }`}
              >
                {/* Image Preview Frame */}
                <div className="relative aspect-square overflow-hidden bg-[#0A0B0F]">
                  <img
                    src={item.url}
                    alt={item.isMain ? 'Cover Photo' : `Gallery Image ${idx}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />

                  {/* Top-Left Role Tag: Cover Photo vs Gallery Image */}
                  {item.isMain ? (
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#D4AF37] text-black text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-md z-10">
                      <Star className="w-2.5 h-2.5 fill-black" />
                      <span>{language === 'bn' ? 'কভার ফটো' : 'COVER PHOTO'}</span>
                    </div>
                  ) : (
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 text-gray-200 border border-white/15 text-[9px] font-mono font-semibold uppercase z-10">
                      {language === 'bn' ? `গ্যালারি #${idx}` : `GALLERY #${idx}`}
                    </div>
                  )}

                  {/* Top-Right Always-Accessible Quick Actions */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewModalUrl(item.url);
                      }}
                      className="p-1.5 rounded-lg bg-black/75 hover:bg-black text-gray-200 hover:text-white border border-white/10 transition-colors cursor-pointer"
                      title="View Fullscreen"
                    >
                      <Eye className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(item.url);
                      }}
                      className="p-1.5 rounded-lg bg-red-950/85 hover:bg-red-700 text-red-200 hover:text-white border border-red-500/30 transition-colors cursor-pointer"
                      title="Remove Image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Offline Fallback Indicator */}
                  {item.url.startsWith('data:') && (
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-blue-900/85 text-blue-200 text-[8px] font-mono flex items-center gap-1 z-10 border border-blue-500/30">
                      <WifiOff className="w-2.5 h-2.5" />
                      <span>OPTIMIZED</span>
                    </div>
                  )}
                </div>

                {/* Persistent Touch-Friendly Cover Selector Footer */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetAsMain(item.url);
                  }}
                  disabled={item.isMain}
                  className={`w-full py-2 px-2 text-[10px] font-bold flex items-center justify-center gap-1 transition-all border-t ${
                    item.isMain
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#D4AF37] cursor-default'
                      : 'bg-[#161822] hover:bg-[#D4AF37] border-white/10 text-gray-300 hover:text-black cursor-pointer'
                  }`}
                >
                  {item.isMain ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{language === 'bn' ? 'প্রধান কভার' : 'Cover Photo'}</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-3 h-3" />
                      <span>{language === 'bn' ? 'কভার সেট করুন' : 'Set as Cover'}</span>
                    </>
                  )}
                </button>
              </div>
            ))}

            {/* Quick Add More Tile (only if slots are available) */}
            {remainingSlots > 0 && (
              <button
                type="button"
                onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-white/10 hover:border-[#D4AF37]/50 bg-[#161822] hover:bg-[#1C1F2C] aspect-square flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#D4AF37] transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-medium">
                  {language === 'bn' ? 'আরও যোগ করুন' : 'Add More'}
                </span>
                <span className="text-[9px] text-gray-500 font-mono">
                  ({remainingSlots} left)
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty state warning when no images are added */
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {language === 'bn'
              ? `সতর্কতা: পণ্য নিবন্ধনের পূর্বে কমপক্ষে ১টি প্রধান কভার ছবি আপলোড করা আবশ্যক (সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি)।`
              : `Required: Upload at least 1 image to serve as the product primary cover photo (maximum ${MAX_PRODUCT_IMAGES} images).`}
          </span>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox Modal */}
      {previewModalUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div 
            className="max-w-3xl max-h-[85vh] relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewModalUrl}
              alt="Fullscreen Preview"
              className="w-full h-full max-h-[80vh] object-contain"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-mono border border-white/20 hover:bg-black cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
