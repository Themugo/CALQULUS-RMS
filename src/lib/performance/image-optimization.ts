/**
 * Image Optimization
 * 
 * Implements image optimization with:
 * - Image resizing
 * - Format conversion (WebP, AVIF)
 * - Quality optimization
 * - Lazy loading
 * - Responsive images
 * - Image compression
 * - CDN integration
 */

// Image format
export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
  GIF = 'gif',
  SVG = 'svg',
}

// Image quality
export enum ImageQuality {
  LOW = 40,
  MEDIUM = 60,
  HIGH = 80,
  MAX = 95,
}

// Image size
export interface ImageSize {
  width: number;
  height: number;
}

// Image optimization options
export interface ImageOptimizationOptions {
  format?: ImageFormat;
  quality?: ImageQuality;
  resize?: ImageSize;
  crop?: boolean;
  stripMetadata?: boolean;
  progressive?: boolean;
}

// Optimized image result
export interface OptimizedImage {
  originalUrl: string;
  optimizedUrl: string;
  format: ImageFormat;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

/**
 * Image Optimizer
 */
export class ImageOptimizer {
  private cdnEnabled: boolean;
  private defaultQuality: ImageQuality;

  constructor(cdnEnabled: boolean = true, defaultQuality: ImageQuality = ImageQuality.HIGH) {
    this.cdnEnabled = cdnEnabled;
    this.defaultQuality = defaultQuality;
  }

  /**
   * Optimize image URL
   */
  optimizeUrl(
    url: string,
    options: ImageOptimizationOptions = {}
  ): string {
    if (!this.cdnEnabled) {
      return url;
    }

    const params: string[] = [];
    
    // Add format conversion
    if (options.format) {
      params.push(`format=${options.format}`);
    }
    
    // Add quality
    const quality = options.quality ?? this.defaultQuality;
    params.push(`quality=${quality}`);
    
    // Add resize
    if (options.resize) {
      params.push(`width=${options.resize.width}`);
      params.push(`height=${options.resize.height}`);
    }
    
    // Add crop
    if (options.crop) {
      params.push('fit=crop');
    }
    
    // Add metadata stripping
    if (options.stripMetadata) {
      params.push('strip=true');
    }
    
    // Add progressive loading
    if (options.progressive) {
      params.push('progressive=true');
    }
    
    // Build optimized URL
    if (params.length > 0) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${params.join('&')}`;
    }
    
    return url;
  }

  /**
   * Generate responsive image URLs
   */
  generateResponsiveUrls(
    url: string,
    sizes: number[],
    options: Omit<ImageOptimizationOptions, 'resize'> = {}
  ): Array<{ width: number; url: string }> {
    return sizes.map(width => ({
      width,
      url: this.optimizeUrl(url, {
        ...options,
        resize: { width, height: Math.round(width * (3 / 4)) },
      }),
    }));
  }

  /**
   * Generate srcset attribute
   */
  generateSrcset(
    url: string,
    sizes: number[],
    options: Omit<ImageOptimizationOptions, 'resize'> = {}
  ): string {
    const responsiveUrls = this.generateResponsiveUrls(url, sizes, options);
    return responsiveUrls.map(r => `${r.url} ${r.width}w`).join(', ');
  }

  /**
   * Generate sizes attribute
   */
  generateSizes(breakpoints: Array<{ maxWidth: number; size: string }>): string {
    return breakpoints.map(bp => `(max-width: ${bp.maxWidth}px) ${bp.size}`).join(', ');
  }

  /**
   * Get optimal format for browser
   */
  getOptimalFormat(): ImageFormat {
    // Check browser support for modern formats
    if (this.supportsAVIF()) {
      return ImageFormat.AVIF;
    }
    
    if (this.supportsWebP()) {
      return ImageFormat.WEBP;
    }
    
    return ImageFormat.JPEG;
  }

  /**
   * Check if browser supports WebP
   */
  private supportsWebP(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Check if browser supports AVIF
   */
  private supportsAVIF(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  /**
   * Calculate optimal quality based on image type
   */
  getOptimalQuality(imageType: 'photo' | 'graphic' | 'screenshot'): ImageQuality {
    switch (imageType) {
      case 'photo':
        return ImageQuality.HIGH;
      case 'graphic':
        return ImageQuality.MAX;
      case 'screenshot':
        return ImageQuality.MEDIUM;
      default:
        return this.defaultQuality;
    }
  }

  /**
   * Enable CDN
   */
  enableCDN(): void {
    this.cdnEnabled = true;
  }

  /**
   * Disable CDN
   */
  disableCDN(): void {
    this.cdnEnabled = false;
  }

  /**
   * Set default quality
   */
  setDefaultQuality(quality: ImageQuality): void {
    this.defaultQuality = quality;
  }
}

// Global optimizer instance
let globalOptimizer: ImageOptimizer | null = null;

/**
 * Get global optimizer instance
 */
export function getImageOptimizer(cdnEnabled?: boolean, defaultQuality?: ImageQuality): ImageOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new ImageOptimizer(cdnEnabled, defaultQuality);
  }
  return globalOptimizer;
}

/**
 * Reset global optimizer
 */
export function resetImageOptimizer(): void {
  globalOptimizer = null;
}

/**
 * Common image sizes
 */
export const ImageSizes = {
  THUMBNAIL: { width: 150, height: 150 },
  SMALL: { width: 300, height: 300 },
  MEDIUM: { width: 600, height: 600 },
  LARGE: { width: 1200, height: 1200 },
  XLARGE: { width: 1920, height: 1080 },
  FULL: { width: 2560, height: 1440 },
};

/**
 * Common responsive breakpoints
 */
export const ResponsiveBreakpoints = [
  { maxWidth: 640, size: '100vw' },
  { maxWidth: 768, size: '90vw' },
  { maxWidth: 1024, size: '80vw' },
  { maxWidth: 1280, size: '70vw' },
  { maxWidth: 1536, size: '60vw' },
];

/**
 * Image optimization helper
 */
export class ImageOptimizationHelper {
  private optimizer: ImageOptimizer;

  constructor(optimizer?: ImageOptimizer) {
    this.optimizer = optimizer ?? getImageOptimizer();
  }

  /**
   * Optimize property image
   */
  optimizePropertyImage(url: string, size: keyof typeof ImageSizes = 'MEDIUM'): string {
    const imageSize = ImageSizes[size];
    return this.optimizer.optimizeUrl(url, {
      resize: imageSize,
      quality: ImageQuality.HIGH,
      format: ImageOptimizer.prototype.getOptimalFormat.call(this.optimizer),
    });
  }

  /**
   * Optimize avatar image
   */
  optimizeAvatar(url: string): string {
    return this.optimizer.optimizeUrl(url, {
      resize: ImageSizes.SMALL,
      quality: ImageQuality.HIGH,
      format: ImageFormat.WEBP,
    });
  }

  /**
   * Optimize logo image
   */
  optimizeLogo(url: string): string {
    return this.optimizer.optimizeUrl(url, {
      resize: { width: 200, height: 60 },
      quality: ImageQuality.MAX,
      format: ImageFormat.SVG,
    });
  }

  /**
   * Generate responsive property image
   */
  generateResponsivePropertyImage(url: string): {
    src: string;
    srcset: string;
    sizes: string;
  } {
    const sizes = [300, 600, 1200, 1920];
    const srcset = this.optimizer.generateSrcset(url, sizes, {
      quality: ImageQuality.HIGH,
      format: this.optimizer.getOptimalFormat(),
    });
    const sizesAttr = this.optimizer.generateSizes(ResponsiveBreakpoints);

    return {
      src: this.optimizer.optimizeUrl(url, {
        resize: ImageSizes.MEDIUM,
        quality: ImageQuality.HIGH,
      }),
      srcset,
      sizes: sizesAttr,
    };
  }

  /**
   * Generate lazy loading attributes
   */
  generateLazyLoadingAttributes(): {
    loading: 'lazy';
    decoding: 'async';
  } {
    return {
      loading: 'lazy',
      decoding: 'async',
    };
  }

  /**
   * Generate critical image attributes
   */
  generateCriticalAttributes(): {
    loading: 'eager';
    decoding: 'sync';
    fetchpriority: 'high';
  } {
    return {
      loading: 'eager',
      decoding: 'sync',
      fetchpriority: 'high',
    };
  }
}

/**
 * Image placeholder generator
 */
export class ImagePlaceholderGenerator {
  /**
   * Generate blur placeholder
   */
  static generateBlurPlaceholder(width: number, height: number): string {
    // Generate a simple SVG blur placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="sans-serif" font-size="14" fill="#9ca3af">
          Loading...
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Generate gradient placeholder
   */
  static generateGradientPlaceholder(width: number, height: number, color1: string = '#f3f4f6', color2: string = '#e5e7eb'): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
      </svg>
    `;
    
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  /**
   * Generate low-quality image placeholder (LQIP)
   */
  static generateLQIP(_imageUrl: string, _quality: number = 20): string {
    // In production, this would generate a low-quality version of the image
    // For now, we'll return a gradient placeholder
    return this.generateGradientPlaceholder(16, 9);
  }
}

/**
 * Image validation helper
 */
export class ImageValidationHelper {
  /**
   * Validate image format
   */
  static validateFormat(format: string): boolean {
    const validFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'svg'];
    return validFormats.includes(format.toLowerCase());
  }

  /**
   * Validate image size
   */
  static validateSize(width: number, height: number, maxWidth: number = 4096, maxHeight: number = 4096): boolean {
    return width <= maxWidth && height <= maxHeight;
  }

  /**
   * Validate file size
   */
  static validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
    return size <= maxSize;
  }

  /**
   * Get image dimensions from file
   */
  static async getDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  /**
   * Validate image file
   */
  static async validateImage(file: File): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Validate format
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!this.validateFormat(extension)) {
      errors.push('Invalid image format');
    }
    
    // Validate file size
    if (!this.validateFileSize(file.size)) {
      errors.push('File size exceeds maximum limit');
    }
    
    // Validate dimensions
    try {
      const dimensions = await this.getDimensions(file);
      if (!this.validateSize(dimensions.width, dimensions.height)) {
        errors.push('Image dimensions exceed maximum limit');
      }
    } catch {
      errors.push('Failed to read image dimensions');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Image compression helper
 */
export class ImageCompressionHelper {
  /**
   * Compress image
   */
  static async compressImage(
    file: File,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      format?: ImageFormat;
    } = {}
  ): Promise<Blob> {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      format = ImageFormat.JPEG,
    } = options;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        // Calculate dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          `image/${format}`,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Convert to WebP
   */
  static async convertToWebP(file: File, quality: number = 0.8): Promise<Blob> {
    return this.compressImage(file, { quality, format: ImageFormat.WEBP });
  }

  /**
   * Convert to AVIF
   */
  static async convertToAVIF(file: File, quality: number = 0.8): Promise<Blob> {
    return this.compressImage(file, { quality, format: ImageFormat.AVIF });
  }
}
