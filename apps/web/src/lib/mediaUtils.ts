/**
 * Utility functions for handling media URLs
 * Follows architecture: Store fileKey in DB, generate URLs at display-time
 */

// CloudFront base URL from environment
const CLOUDFRONT_URL = import.meta.env.VITE_CLOUDFRONT_URL || 'https://dgybp60vsropa.cloudfront.net';

/**
 * Convert fileKey to CloudFront URL
 * 
 * @param fileKey - S3 object key (e.g., "attachments/image123.jpg")
 * @returns CloudFront URL
 */
export function getPublicUrl(fileKey: string | undefined): string | undefined {
  if (!fileKey) return undefined;
  
  // If already a full URL, return as is
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    return fileKey;
  }
  
  // Construct CloudFront URL
  return `${CLOUDFRONT_URL}/${fileKey}`;
}

/**
 * Extract filename from fileKey
 * 
 * @param fileKey - S3 object key
 * @returns Filename
 */
export function getFileName(fileKey: string): string {
  return fileKey.split('/').pop() || fileKey;
}

/**
 * Check if file is an image based on fileKey
 * 
 * @param fileKey - S3 object key
 * @returns True if image
 */
export function isImageFile(fileKey: string): boolean {
  const ext = fileKey.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
}

/**
 * Check if file is a video based on fileKey
 * 
 * @param fileKey - S3 object key
 * @returns True if video
 */
export function isVideoFile(fileKey: string): boolean {
  const ext = fileKey.split('.').pop()?.toLowerCase();
  return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '');
}

/**
 * Get file icon based on extension
 * 
 * @param fileKey - S3 object key
 * @returns Icon name for lucide-react
 */
export function getFileIcon(fileKey: string): string {
  const ext = fileKey.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return 'Image';
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext || '')) {
    return 'Video';
  }
  if (['pdf'].includes(ext || '')) {
    return 'FileText';
  }
  if (['doc', 'docx', 'txt'].includes(ext || '')) {
    return 'FileText';
  }
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
    return 'Sheet';
  }
  if (['zip', 'rar', '7z'].includes(ext || '')) {
    return 'Archive';
  }
  
  return 'File';
}
