import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Star, 
  Trash2, 
  Check, 
  AlertCircle, 
  Plus, 
  Link as LinkIcon, 
  Eye, 
  Loader2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { uploadProductImage, uploadMultipleProductImages } from '../../services/storageService';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Consolidate all image items in display order: mainImage first, followed by gallery
  const allImages = React.useMemo(() => {
    const list: Array<{ url: string; isMain: boolean; index: number }> = [];
    if (mainImage) {
      list.push({ url: mainImage, isMain: true, index: 0 });
    }
    gallery.forEach((url, idx) => {
      // Avoid duplicate display if mainImage accidentally in gallery
      if (url !== mainImage) {
        list.push({ url, isMain: false, index: list.length });
      }
    });
    return list;
  }, [mainImage, gallery]);

  // Handle setting an image as the primary cover image
  const handleSetAsMain = (selectedUrl: string) => {
    if (selectedUrl === mainImage) return;

    // Remove selectedUrl from current gallery, and push old mainImage into gallery
    const newGallery = gallery.filter((u) => u !== selectedUrl);
    if (mainImage && !newGallery.includes(mainImage)) {
      newGallery.unshift(mainImage);
    }

    onChange(selectedUrl, newGallery);
  };

  // Handle removing an image
  const handleRemoveImage = (urlToRemove: string) => {
    if (urlToRemove === mainImage) {
      // If removing main image, promote the first item in gallery if exists
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

  // Process and upload file list to Firebase Storage
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setErrorMessage(null);

    // Validate types and sizes
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const invalidFiles = fileArray.filter(
      (f) => !validExtensions.includes(f.type) && !f.name.match(/\.(jpg|jpeg|png|webp)$/i)
    );

    if (invalidFiles.length > 0) {
      setErrorMessage(
        language === 'bn' 
          ? 'শুধুমাত্র JPG, PNG বা WebP ফরম্যাটের ছবি আপলোড করুন।' 
          : 'Please select valid image files (.jpg, .png, .webp).'
      );
      return;
    }

    // Size limit check (15MB per file)
    const oversizedFiles = fileArray.filter((f) => f.size > 15 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setErrorMessage(
        language === 'bn'
          ? 'ছবির সাইজ ১৫ মেগাবাইট (MB) এর কম হতে হবে।'
          : 'Each image file size must be less than 15MB.'
      );
      return;
    }

    setIsUploading(true);
    const initialUploadState: UploadingFileState[] = fileArray.map((file, idx) => ({
      id: `${Date.now()}_${idx}`,
      fileName: file.name,
      progress: 5,
    }));
    setUploadingFiles(initialUploadState);

    try {
      const uploadPromises = fileArray.map(async (file, idx) => {
        const result = await uploadProductImage(file, productId, (progress) => {
          setUploadingFiles((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, progress } : item))
          );
        });
        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Integrate new URLs into mainImage & gallery
      let currentMain = mainImage;
      let currentGallery = [...gallery];

      uploadedUrls.forEach((url) => {
        if (!currentMain) {
          currentMain = url;
        } else if (!currentGallery.includes(url) && url !== currentMain) {
          currentGallery.push(url);
        }
      });

      onChange(currentMain, currentGallery);
    } catch (err: any) {
      console.error('Batch product image upload failed:', err);
      setErrorMessage(
        err?.message || (language === 'bn' ? 'ছবি আপলোড করতে ব্যর্থ হয়েছে।' : 'Failed to upload images.')
      );
    } finally {
      setIsUploading(false);
      setUploadingFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [productId, mainImage, gallery, onChange, language]);

  // Drag and drop event handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Manual URL Add handler
  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

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
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
            {language === 'bn' ? 'পণ্যের ছবি গ্যালারি ও কভার ফটো *' : 'Product Visuals & Cover Imagery *'}
          </label>
          <span className="text-[11px] text-gray-400">
            {language === 'bn' 
              ? 'প্রথম ছবিটি প্রধান কভার হিসেবে প্রদর্শিত হবে। যেকোনো ছবিতে ক্লিক করে প্রধান কভার হিসেবে সেট করতে পারবেন।' 
              : 'The first image is the primary cover photo. Click any image to set it as main cover.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? (language === 'bn' ? 'লুকান' : 'Hide URL Input') : (language === 'bn' ? 'URL দিয়ে যোগ করুন' : 'Add by URL')}</span>
          </button>
        </div>
      </div>

      {/* Optional Direct URL Input field */}
      {showUrlInput && (
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
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-200 cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
          isDragOver
            ? 'border-[#D4AF37] bg-[#D4AF37]/10 scale-[1.01]'
            : 'border-white/15 bg-[#14151D] hover:border-[#D4AF37]/50 hover:bg-[#181A24]'
        } ${disabled || isUploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-3 w-full max-w-sm py-2">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-white block">
                {language === 'bn' 
                  ? `ফায়ারবেস স্টোরেজে ছবি আপলোড হচ্ছে (${uploadingFiles.length} টি)...` 
                  : `Uploading ${uploadingFiles.length} image(s) to Firebase Storage...`}
              </span>
              <div className="space-y-1.5 pt-1">
                {uploadingFiles.map((file) => (
                  <div key={file.id} className="text-[10px] space-y-0.5">
                    <div className="flex justify-between text-gray-400 font-mono">
                      <span className="truncate max-w-[200px]">{file.fileName}</span>
                      <span className="text-[#D4AF37]">{file.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-[#D4AF37] h-full transition-all duration-200"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3.5 rounded-full bg-[#1F222E] border border-white/10 text-[#D4AF37] shadow-inner group-hover:scale-105 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-white">
                {language === 'bn' ? (
                  <>ছবি এখানে টেনে আনুন (Drag & Drop) অথবা <span className="text-[#D4AF37] underline underline-offset-2">ব্রাউজ করুন</span></>
                ) : (
                  <>Drag & drop product images here, or <span className="text-[#D4AF37] underline underline-offset-2">Browse Files</span></>
                )}
              </p>
              <p className="text-[11px] text-gray-400 font-mono">
                Supports multiple files • PNG, JPG, WEBP (Max 15MB each)
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-white/5 border border-white/10 text-gray-300">
                Direct Firebase Storage Bucket
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-medium bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
                Multi-Image Upload Enabled
              </span>
            </div>
          </>
        )}
      </div>

      {/* Error message alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Thumbnail Previews Grid */}
      {allImages.length > 0 ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-mono">
              {allImages.length} {allImages.length === 1 ? 'Image' : 'Images'} Uploaded
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

            {/* Quick Add More Tile */}
            <button
              type="button"
              onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-white/10 hover:border-[#D4AF37]/50 bg-[#161822] hover:bg-[#1C1F2C] aspect-square flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#D4AF37] transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-medium">{language === 'bn' ? 'আরও যোগ করুন' : 'Add More'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty state warning when no images are added */
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {language === 'bn'
              ? 'সতর্কতা: পণ্য নিবন্ধনের পূর্বে কমপক্ষে ১টি প্রধান কভার ছবি আপলোড করা আবশ্যক।'
              : 'Required: Upload at least 1 image to serve as the product primary cover photo.'}
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
