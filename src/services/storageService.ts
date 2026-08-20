import { 
  ref, 
  uploadBytesResumable, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '../lib/firebase';

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
  const extension = file.name.split('.').pop() || 'jpg';
  const sanitizedOrderId = orderId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `payment_proofs/${sanitizedOrderId}_${Date.now()}.${extension}`;

  try {
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        orderId: sanitizedOrderId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return {
      url: downloadUrl,
      fileName: file.name,
    };
  } catch (error) {
    console.warn('Firebase storage direct upload fallback to local base64 preview:', error);
    
    // Convert to local Base64 data URL for persistence and preview if storage bucket is restricted
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          fileName: file.name,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Upload a single product image to Firebase Storage under `/products/{productId}/`
 * with real-time percentage progress callback and fallback support.
 */
export async function uploadProductImage(
  file: File,
  productId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadedImageResult> {
  const cleanProductId = (productId || 'new_product').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `products/${cleanProductId}/${timestamp}_${cleanFileName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const metadata = {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        productId: cleanProductId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Use uploadBytesResumable for real-time progress events
    return await new Promise<UploadedImageResult>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(progress);
          }
        },
        async (error) => {
          console.warn('Direct uploadTask error, attempting uploadBytes fallback:', error);
          try {
            const fallbackSnapshot = await uploadBytes(storageRef, file, metadata);
            const downloadUrl = await getDownloadURL(fallbackSnapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              url: downloadUrl,
              fileName: file.name,
              storagePath,
              sizeBytes: file.size,
            });
          } catch (fallbackError) {
            console.warn('Fallback uploadBytes also failed, using client data URL fallback:', fallbackError);
            const reader = new FileReader();
            reader.onload = () => {
              if (onProgress) onProgress(100);
              resolve({
                url: reader.result as string,
                fileName: file.name,
                storagePath,
                sizeBytes: file.size,
              });
            };
            reader.onerror = () => reject(new Error('Failed to read image buffer'));
            reader.readAsDataURL(file);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              url: downloadUrl,
              fileName: file.name,
              storagePath,
              sizeBytes: file.size,
            });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  } catch (error) {
    console.warn('Storage initial reference error, converting to local preview:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (onProgress) onProgress(100);
        resolve({
          url: reader.result as string,
          fileName: file.name,
          storagePath,
          sizeBytes: file.size,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }
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
