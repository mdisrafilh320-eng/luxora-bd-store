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
  Zap
} from 'lucide-react';
import { uploadProductImage } from '../../services/storageService';
import { compressImage } from '../../utils/imageCompressor';

const MAX_PRODUCT_IMAGES = 5;

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
  fileName: string;
  progress: number;
  phase: 'compressing' | 'uploading';
  originalSizeKB: number;
  compressedSizeKB?: number;
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
  const timeoutRef = useRef<any>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Clean up any pending abort controllers and timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Consolidate all image items in display order: mainImage first, followed by gallery
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

  // Handle setting an image as the primary cover image
  const handleSetAsMain = (selectedUrl: string) => {
    if (selectedUrl === mainImage) return;

    const newGallery = gallery.filter((u) => u !== selectedUrl);
    if (mainImage && !newGallery.includes(mainImage)) {
      newGallery.unshift(mainImage);
    }

    onChange(selectedUrl, newGallery);
  };

  // Handle removing an image
  const handleRemoveImage = (urlToRemove: string) => {
    if (urlToRemove === mainImage) {
      if (gallery.length > 0) {
        const nextMain = gallery[0];
        const nextGallery = gallery.slice(1);
        onChange(nextMain, nextGallery);
      } else {
        onChange('', []);
      }
    } else {
      const nextGallery = gallery.filter((u) => u !== urlToRemove);
      onChange(mainImage, nextGallery);
    }
  };

  // Explicit user cancellation handler
  const handleCancelUpload = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
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
          ? `সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবির সীমা অনুযায়ী কেবল প্রথম ${remainingSlots}টি ছবি নেওয়া হয়েছে (বাকিগুলো বাদ দেওয়া হয়েছে)।`
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

    // Initialize AbortController for this batch
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsUploading(true);

    const initialUploadState: UploadingFileState[] = filesToProcess.map((file, idx) => ({
      id: `${Date.now()}_${idx}`,
      fileName: file.name,
      progress: 10,
      phase: 'compressing',
      originalSizeKB: Math.round(file.size / 1024),
    }));
    setUploadingFiles(initialUploadState);

    // Watchdog timeout: abort if overall batch upload exceeds 25 seconds
    timeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsUploading(false);
      setUploadingFiles([]);
      setErrorMessage(
        language === 'bn'
          ? 'আপলোড সময়সীমা অতিক্রম করেছে (২৫ সেকেন্ড)। ইন্টারনেট সংযোগ ধীরগতির হতে পারে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
          : 'Upload timed out after 25 seconds. Network connection was too slow. You can retry with a smaller image or retry now.'
      );
    }, 25000);

    try {
      const uploadPromises = filesToProcess.map(async (file, idx) => {
        // Step 2: Client-side compression before sending to network
        setUploadingFiles((prev) =>
          prev.map((item, i) =>
            i === idx ? { ...item, phase: 'compressing', progress: 30 } : item
          )
        );

        let optimizedFile: File = file;
        try {
          optimizedFile = await compressImage(file, {
            maxWidth: 1280,
            maxHeight: 1280,
            quality: 0.82,
            targetMimeType: 'image/webp',
          });
        } catch (compErr) {
          console.warn('[ProductImageUploader] Client compression failed, using original:', compErr);
        }

        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const compKB = Math.round(optimizedFile.size / 1024);
        setUploadingFiles((prev) =>
          prev.map((item, i) =>
            i === idx ? { ...item, phase: 'uploading', compressedSizeKB: compKB, progress: 45 } : item
          )
        );

        // Upload to Firebase Storage with progress callback, cancellation signal, and internal timeout
        const result = await uploadProductImage(
          optimizedFile,
          productId,
          (progress) => {
            setUploadingFiles((prev) =>
              prev.map((item, i) =>
                i === idx ? { ...item, progress: Math.max(45, progress) } : item
              )
            );
          },
          { signal: abortController.signal, timeoutMs: 18000 }
        );

        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Integrate newly uploaded URLs into mainImage & gallery
      let currentMain = mainImage;
      let currentGallery = [...gallery];

      uploadedUrls.forEach((url) => {
        if (!currentMain) {
          currentMain = url;
        } else if (!currentGallery.includes(url) && url !== currentMain) {
          if (currentGallery.length + 1 < MAX_PRODUCT_IMAGES) {
            currentGallery.push(url);
          }
        }
      });

      onChange(currentMain, currentGallery);
      setInfoMessage(
        language === 'bn'
          ? `সফলভাবে ${uploadedUrls.length}টি ছবি কম্প্রেস ও আপলোড করা হয়েছে!`
          : `Successfully compressed & uploaded ${uploadedUrls.length} image(s)!`
      );
    } catch (err: any) {
      if (err?.message === 'Upload cancelled' || err?.message === 'Upload cancelled by user.') {
        // Handled via user cancel
        return;
      }
      console.error('Batch product image upload failed:', err);
      setErrorMessage(
        err?.message || (language === 'bn' ? 'ছবি আপলোড করতে ব্যর্থ হয়েছে।' : 'Failed to upload images. Check network.')
      );
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsUploading(false);
      setUploadingFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [productId, mainImage, gallery, remainingSlots, onChange, language]);

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

  // Manual URL Add handler
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (remainingSlots <= 0) {
      setErrorMessage(
        language === 'bn'
          ? `সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবি ইতিমধ্যে যুক্ত রয়েছে।`
          : `Maximum ${MAX_PRODUCT_IMAGES} images limit reached.`
      );
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:')) {
      setErrorMessage(language === 'bn' ? 'সঠিক ইমেজ URL দিন (https://)' : 'Please enter a valid HTTP/HTTPS image URL');
      return;
    }

    setErrorMessage(null);
    if (!mainImage) {
      onChange(trimmed, gallery);
    } else if (!gallery.includes(trimmed) && trimmed !== mainImage) {
      onChange(mainImage, [...gallery, trimmed]);
    }
    setUrlInput('');
    setShowUrlInput(false);
  };

  return (
    <div id="product-image-uploader" className="space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
            {language === 'bn' ? 'পণ্যের ছবি গ্যালারি ও কভার ফটো *' : 'Product Visuals & Cover Imagery *'}
          </label>
          <span className="text-[11px] text-gray-400">
            {language === 'bn' 
              ? `সর্বোচ্চ ${MAX_PRODUCT_IMAGES}টি ছবি আপলোড করা যাবে। ক্লায়েন্ট-সাইড কম্প্রেশন সক্রিয় রয়েছে।` 
              : `Up to ${MAX_PRODUCT_IMAGES} images max with automatic client-side compression.`}
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
              className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono cursor-pointer"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{showUrlInput ? (language === 'bn' ? 'লুকান' : 'Hide URL') : (language === 'bn' ? 'URL দিয়ে যোগ' : 'Add by URL')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Direct URL Input field */}
      {showUrlInput && remainingSlots > 0 && (
        <div className="p-3 rounded-xl bg-[#181A22] border border-[#D4AF37]/30 flex items-center gap-2 animate-fadeIn">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
            placeholder="https://images.unsplash.com/... or CDN link"
            className="flex-1 bg-[#12141A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#D4AF37]"
          />
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black text-xs font-bold hover:brightness-110 cursor-pointer shrink-0"
          >
            {language === 'bn' ? 'যোগ করুন' : 'Add Image'}
          </button>
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
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-bold text-white">
                {language === 'bn' 
                  ? `ছবি প্রসেসিং ও আপলোড হচ্ছে (${uploadingFiles.length} টি)...` 
                  : `Processing & Uploading ${uploadingFiles.length} image(s)...`}
              </span>
            </div>

            <div className="space-y-2 pt-1 text-left">
              {uploadingFiles.map((file) => (
                <div key={file.id} className="p-2.5 rounded-lg bg-[#0F1015] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-300">
                    <span className="truncate max-w-[200px] font-mono text-[11px]">{file.fileName}</span>
                    <span className="text-[10px] font-mono text-[#D4AF37]">
                      {file.phase === 'compressing' ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 animate-pulse" /> Compressing...
                        </span>
                      ) : (
                        `${file.progress}%`
                      )}
                    </span>
                  </div>

                  {file.compressedSizeKB && (
                    <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span>{file.originalSizeKB} KB → {file.compressedSizeKB} KB</span>
                      <span className="text-emerald-400 font-bold">
                        ({Math.round((1 - file.compressedSizeKB / file.originalSizeKB) * 100)}% saved)
                      </span>
                    </div>
                  )}

                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        file.phase === 'compressing' ? 'bg-amber-400 animate-pulse' : 'bg-[#D4AF37]'
                      }`}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Explicit Cancel Upload Button to prevent freezing */}
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
                <span>{language === 'bn' ? 'আপলোড বাতিল করুন (Cancel)' : 'Cancel Upload'}</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 font-mono text-center">
              Automatic timeout protected (25s maximum)
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
                {language === 'bn' ? 'সর্বোচ্চ ৫টি ছবি যুক্ত রয়েছে' : 'Maximum 5 Images Reached'}
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
                  <>ছবি টেনে আনুন (Drag & Drop) অথবা <span className="text-[#D4AF37] underline underline-offset-2">ব্রাউজ করুন</span></>
                ) : (
                  <>Drag & drop product images here, or <span className="text-[#D4AF37] underline underline-offset-2">Browse Files</span></>
                )}
              </p>
              <p className="text-[11px] text-gray-400 font-mono">
                PNG, JPG, WEBP • Max 5 images total • Remaining slots: {remainingSlots}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Auto-Compression
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
                Max {MAX_PRODUCT_IMAGES} Images
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/5 border border-white/10 text-gray-300">
                Timeout Protected
              </span>
            </div>
          </>
        )}
      </div>

      {/* Info message banner */}
      {infoMessage && (
        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
            <span>{infoMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setInfoMessage(null)}
            className="text-gray-400 hover:text-white"
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
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono">
              {allImages.length} / {MAX_PRODUCT_IMAGES} {allImages.length === 1 ? 'Image' : 'Images'} Uploaded
              {mainImage ? ' • 1 Primary Cover' : ''}
            </span>
            <span className="text-[11px] text-gray-500">
              {language === 'bn' ? 'কভার পরিবর্তন করতে "Set Cover" ক্লিক করুন' : 'Click "Set Cover" on any thumbnail to swap primary'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
            {allImages.map((item, idx) => (
              <div
                key={item.url + idx}
                className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all bg-[#0F1015] shadow-lg ${
                  item.isMain
                    ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-[#D4AF37]/15'
                    : 'border-white/10 hover:border-white/40'
                }`}
              >
                {/* Image Thumbnail */}
                <img
                  src={item.url}
                  alt={`Product Preview ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                {/* Primary Cover Badge */}
                {item.isMain && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#D4AF37] text-black text-[9px] font-black tracking-wider uppercase flex items-center gap-1 shadow-md z-10">
                    <Star className="w-2.5 h-2.5 fill-black" />
                    <span>MAIN COVER</span>
                  </div>
                )}

                {/* Action Hover Overlay */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-between p-2 z-20">
                  {/* Top action row */}
                  <div className="w-full flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewModalUrl(item.url);
                      }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white transition-colors cursor-pointer"
                      title="View Fullscreen"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(item.url);
                      }}
                      className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-700 text-red-200 hover:text-white transition-colors cursor-pointer"
                      title="Remove Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Main Cover Switcher */}
                  {!item.isMain ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetAsMain(item.url);
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-black text-[10px] font-bold flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Star className="w-3 h-3" />
                      <span>{language === 'bn' ? 'কভার সেট করুন' : 'Set as Main'}</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-[#D4AF37] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'bn' ? 'প্রধান কভার' : 'Current Cover'}
                    </span>
                  )}
                </div>
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
              className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/80 text-white text-xs font-mono border border-white/20 hover:bg-black"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
