/**
 * Compresses an image file using canvas with target file size
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1920)
 * @param targetSizeKB - Target file size in KB (default: 200)
 * @returns Compressed image as a File
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  targetSizeKB: number = 100
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = async () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Iteratively compress to target size
        let quality = 0.9;
        let compressedFile: File | null = null;
        const targetSizeBytes = targetSizeKB * 1024;
        const minQuality = 0.1;
        
        while (quality >= minQuality) {
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', quality);
          });
          
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          
          compressedFile = new File(
            [blob],
            file.name,
            { type: 'image/jpeg', lastModified: Date.now() }
          );
          
          // Check if we've reached target size
          if (compressedFile.size <= targetSizeBytes) {
            break;
          }
          
          // Reduce quality for next iteration
          quality -= 0.1;
        }
        
        if (!compressedFile) {
          reject(new Error('Failed to compress image'));
          return;
        }
        
        resolve(compressedFile);
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Compresses multiple images in parallel
 * @param files - Array of image files to compress
 * @param maxWidth - Maximum width (default: 1920)
 * @param maxHeight - Maximum height (default: 1920)
 * @param targetSizeKB - Target file size in KB (default: 200)
 * @returns Array of compressed images as Files
 */
export const compressImages = async (
  files: File[],
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  targetSizeKB: number = 100
): Promise<File[]> => {
  return Promise.all(
    files.map(file => compressImage(file, maxWidth, maxHeight, targetSizeKB))
  );
};
