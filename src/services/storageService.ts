import { 
  ref, 
  uploadBytesResumable, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import { compressImage } from '../utils/imageCompressor';

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export interface UploadedImageResult {
  url: string;
  fileName: string;
  storagePath: string;
  sizeBytes: number;
}

/**
 * Upload payment screenshot proof to Firebase Storage with robust client fallback
 */
export async function uploadPaymentProof(
  file: File, 
  orderId: string
): Promise<{ url: string; fileName: string }> {
  // Compress payment proof to save bandwidth
  const optimizedFile = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
  const extension = optimizedFile.name.split('.').pop() || 'webp';
  const sanitizedOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `payment_proofs/${sanitizedOrderId}_${Date.now()}.${extension}`;

  try {
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, optimizedFile, {
      contentType: optimizedFile.type,
      customMetadata: {
        orderId: sanitizedOrderId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return {
      url: downloadUrl,
      fileName: optimizedFile.name,
    };
  } catch (error) {
    console.warn('Firebase storage direct upload fallback to local base64 preview:', error);
    
    // Convert to local Base64 data URL for persistence and preview if storage bucket is restricted
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          fileName: optimizedFile.name,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(optimizedFile);
    });
  }
}


/**
 * Upload a single product image to Firebase Storage under `/products/{productId}/`
 * with real-time percentage progress callback, timeout protection, cancellation signal,
 * and automatic client-side compression.
 */
export async function uploadProductImage(
  file: File,
  productId: string,
  onProgress?: UploadProgressCallback,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<UploadedImageResult> {
  const cleanProductId = (productId || 'new_product').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timeoutMs = options?.timeoutMs ?? 15000; // 15s default timeout
  const signal = options?.signal;

  if (signal?.aborted) {
    throw new Error('Upload cancelled by user.');
  }

  // Step 1: Client-side compression before network transfer
  let optimizedFile = file;
  try {
    optimizedFile = await compressImage(file, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.82,
      targetMimeType: 'image/webp',
    });
  } catch (compErr) {
    console.warn('Image compression bypassed:', compErr);
    optimizedFile = file;
  }

  if (signal?.aborted) {
    throw new Error('Upload cancelled by user.');
  }

  const timestamp = Date.now();
  const cleanFileName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `products/${cleanProductId}/${timestamp}_${cleanFileName}`;

  return new Promise<UploadedImageResult>((resolve, reject) => {
    let isSettled = false;
    let timer: any = null;
    let uploadTask: any = null;

    const cleanup = () => {
      isSettled = true;
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', handleAbort);
    };

    const handleAbort = () => {
      if (isSettled) return;
      cleanup();
      if (uploadTask) {
        try { uploadTask.cancel(); } catch (_) {}
      }
      reject(new Error('Upload cancelled by user.'));
    };

    if (signal) {
      signal.addEventListener('abort', handleAbort);
    }

    // Set hard timeout guard so uploads NEVER hang indefinitely
    timer = setTimeout(() => {
      if (isSettled) return;
      console.warn(`[storageService] Upload for ${cleanFileName} timed out after ${timeoutMs}ms`);
      cleanup();
      if (uploadTask) {
        try { uploadTask.cancel(); } catch (_) {}
      }
      reject(new Error(`Upload timed out (${Math.round(timeoutMs / 1000)}s). Network connection was too slow. You can retry or cancel.`));
    }, timeoutMs);

    try {
      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: optimizedFile.type || 'image/webp',
        customMetadata: {
          productId: cleanProductId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      };

      uploadTask = uploadBytesResumable(storageRef, optimizedFile, metadata);

      uploadTask.on(
        'state_changed',
        (snapshot: any) => {
          if (isSettled) return;
          if (snapshot.totalBytes > 0 && onProgress) {
            const progress = Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
            onProgress(progress);
          }
        },
        async (error: any) => {
          if (isSettled) return;
          console.warn('uploadTask reported error, attempting uploadBytes fallback:', error);
          try {
            const fallbackSnapshot = await uploadBytes(storageRef, optimizedFile, metadata);
            const downloadUrl = await getDownloadURL(fallbackSnapshot.ref);
            if (isSettled) return;
            cleanup();
            if (onProgress) onProgress(100);
            resolve({
              url: downloadUrl,
              fileName: optimizedFile.name,
              storagePath,
              sizeBytes: optimizedFile.size,
            });
          } catch (fallbackError) {
            if (isSettled) return;
            cleanup();
            reject(new Error(`Storage upload failed: ${fallbackError?.message || error?.message || 'Check connection'}`));
          }
        },
        async () => {
          if (isSettled) return;
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (isSettled) return;
            cleanup();
            if (onProgress) onProgress(100);
            resolve({
              url: downloadUrl,
              fileName: optimizedFile.name,
              storagePath,
              sizeBytes: optimizedFile.size,
            });
          } catch (err: any) {
            if (isSettled) return;
            cleanup();
            reject(err);
          }
        }
      );
    } catch (error: any) {
      if (isSettled) return;
      cleanup();
      reject(error);
    }
  });
}

/**
 * Upload multiple product images simultaneously with concurrent progress tracking
 */
export async function uploadMultipleProductImages(
  files: File[],
  productId: string,
  onFileProgress?: (fileIndex: number, progressPercent: number) => void
): Promise<UploadedImageResult[]> {
  const uploadPromises = files.map((file, index) => {
    return uploadProductImage(file, productId, (progress) => {
      if (onFileProgress) {
        onFileProgress(index, progress);
      }
    });
  });

  return Promise.all(uploadPromises);
}

/**
 * Delete a product image from Firebase Storage if it's a cloud storage URL
 */
export async function deleteProductImageFromStorage(storagePathOrUrl: string): Promise<boolean> {
  if (!storagePathOrUrl || storagePathOrUrl.startsWith('data:')) {
    return true;
  }

  try {
    // If it's a full download URL containing firebasestorage.googleapis.com, extract or create ref
    let imageRef;
    if (storagePathOrUrl.startsWith('http')) {
      imageRef = ref(storage, storagePathOrUrl);
    } else {
      imageRef = ref(storage, storagePathOrUrl);
    }
    await deleteObject(imageRef);
    return true;
  } catch (error) {
    console.warn('Could not delete image from Firebase Storage (may have been removed already):', error);
    return false;
  }
}
