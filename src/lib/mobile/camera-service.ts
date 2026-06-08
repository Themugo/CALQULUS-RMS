/**
 * Camera Service
 * 
 * Handles camera workflows for mobile:
 * - Photo capture
 * - Document scanning
 * - Image processing
 * - File selection
 */

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { compressImage, resizeImage } from '../offline/network-optimization';

// Image capture options
export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  resultType?: CameraResultType;
  source?: CameraSource;
  saveToGallery?: boolean;
  width?: number;
  height?: number;
}

// Captured image result
export interface CapturedImage {
  dataUrl: string;
  filePath: string;
  format: string;
  webPath: string;
  base64String?: string;
}

/**
 * Capture photo from camera
 */
export async function capturePhoto(options?: CameraOptions): Promise<CapturedImage> {
  const defaultOptions: CameraOptions = {
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    saveToGallery: true,
    ...options,
  };

  try {
    const photo = await Camera.getPhoto(defaultOptions);
    
    // Process the photo
    const processedImage = await processPhoto(photo, defaultOptions);
    
    return processedImage;
  } catch (error) {
    console.error('Failed to capture photo:', error);
    throw new Error('Photo capture failed');
  }
}

/**
 * Select photo from gallery
 */
export async function selectPhoto(options?: CameraOptions): Promise<CapturedImage> {
  const defaultOptions: CameraOptions = {
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
    ...options,
  };

  try {
    const photo = await Camera.getPhoto(defaultOptions);
    
    // Process the photo
    const processedImage = await processPhoto(photo, defaultOptions);
    
    return processedImage;
  } catch (error) {
    console.error('Failed to select photo:', error);
    throw new Error('Photo selection failed');
  }
}

/**
 * Capture document (optimized for document scanning)
 */
export async function captureDocument(options?: CameraOptions): Promise<CapturedImage> {
  const defaultOptions: CameraOptions = {
    quality: 80,
    allowEditing: true,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    saveToGallery: false,
    width: 1920,
    height: 1080,
    ...options,
  };

  try {
    const photo = await Camera.getPhoto(defaultOptions);
    
    // Process the photo with document optimization
    const processedImage = await processDocument(photo, defaultOptions);
    
    return processedImage;
  } catch (error) {
    console.error('Failed to capture document:', error);
    throw new Error('Document capture failed');
  }
}

/**
 * Process photo
 */
async function processPhoto(photo: Photo, options: CameraOptions): Promise<CapturedImage> {
  let dataUrl = photo.webPath || '';
  
  // Convert to base64 if needed
  if (photo.base64String) {
    dataUrl = `data:image/${photo.format};base64,${photo.base64String}`;
  }

  // Compress image if quality is specified
  if (options.quality && options.quality < 90) {
    try {
      const blob = await dataUrlToBlob(dataUrl);
      const file = new File([blob], 'photo.jpg', { type: blob.type });
      const compressedBlob = await compressImage(file, options.quality / 100);
      dataUrl = await blobToDataUrl(compressedBlob);
    } catch (error) {
      console.error('Failed to compress image:', error);
    }
  }

  // Resize if dimensions are specified
  if (options.width || options.height) {
    try {
      const blob = await dataUrlToBlob(dataUrl);
      const file = new File([blob], 'photo.jpg', { type: blob.type });
      const resizedBlob = await resizeImage(
        file,
        options.width || 1920,
        options.height || 1080
      );
      dataUrl = await blobToDataUrl(resizedBlob);
    } catch (error) {
      console.error('Failed to resize image:', error);
    }
  }

  return {
    dataUrl,
    filePath: photo.path || '',
    format: photo.format || 'jpeg',
    webPath: photo.webPath || '',
    base64String: photo.base64String,
  };
}

/**
 * Process document with optimization
 */
async function processDocument(photo: Photo, _options: CameraOptions): Promise<CapturedImage> {
  let dataUrl = photo.webPath || '';
  
  // Convert to base64 if needed
  if (photo.base64String) {
    dataUrl = `data:image/${photo.format};base64,${photo.base64String}`;
  }

  // Compress for document (lower quality for smaller file size)
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], 'document.jpg', { type: blob.type });
    const compressedBlob = await compressImage(file, 0.7); // 70% quality
    dataUrl = await blobToDataUrl(compressedBlob);
  } catch (error) {
    console.error('Failed to compress document:', error);
  }

  // Resize to standard document size
  try {
    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], 'document.jpg', { type: blob.type });
    const resizedBlob = await resizeImage(file, 1920, 1080);
    dataUrl = await blobToDataUrl(resizedBlob);
  } catch (error) {
    console.error('Failed to resize document:', error);
  }

  return {
    dataUrl,
    filePath: photo.path || '',
    format: photo.format || 'jpeg',
    webPath: photo.webPath || '',
    base64String: photo.base64String,
  };
}

/**
 * Convert data URL to blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Convert blob to data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Save photo to device storage
 */
export async function savePhotoToDevice(dataUrl: string, fileName: string): Promise<string> {
  try {
    const data = dataUrl.split(',')[1];
    const filePath = `${fileName}.jpg`;
    
    await Filesystem.writeFile({
      path: filePath,
      data,
      directory: Directory.Data,
      recursive: true,
    });
    
    return filePath;
  } catch (error) {
    console.error('Failed to save photo:', error);
    throw new Error('Failed to save photo to device');
  }
}

/**
 * Load photo from device storage
 */
export async function loadPhotoFromDevice(filePath: string): Promise<string> {
  try {
    const file = await Filesystem.readFile({
      path: filePath,
      directory: Directory.Data,
    });
    
    const dataUrl = `data:image/jpeg;base64,${file.data}`;
    return dataUrl;
  } catch (error) {
    console.error('Failed to load photo:', error);
    throw new Error('Failed to load photo from device');
  }
}

/**
 * Delete photo from device storage
 */
export async function deletePhotoFromDevice(filePath: string): Promise<void> {
  try {
    await Filesystem.deleteFile({
      path: filePath,
      directory: Directory.Data,
    });
  } catch (error) {
    console.error('Failed to delete photo:', error);
    throw new Error('Failed to delete photo from device');
  }
}

/**
 * Check camera permissions
 */
export async function checkCameraPermissions(): Promise<boolean> {
  try {
    const permissions = await Camera.checkPermissions();
    return permissions.camera === 'granted' || permissions.photos === 'granted';
  } catch (error) {
    console.error('Failed to check camera permissions:', error);
    return false;
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  try {
    const permissions = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });
    return permissions.camera === 'granted' || permissions.photos === 'granted';
  } catch (error) {
    console.error('Failed to request camera permissions:', error);
    return false;
  }
}

/**
 * Get camera source options
 */
export function getCameraSourceOptions(): Array<{ value: CameraSource; label: string }> {
  return [
    { value: CameraSource.Camera, label: 'Camera' },
    { value: CameraSource.Photos, label: 'Photo Library' },
    { value: CameraSource.Prompt, label: 'Prompt' },
  ];
}
