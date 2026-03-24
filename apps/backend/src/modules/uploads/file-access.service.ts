import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../../config/aws.js';
import { config } from '../../config/env.js';
import AppError from '../../utils/AppError.js';

/**
 * File Access Service
 * 
 * RESPONSIBILITY: Convert S3 file keys into accessible URLs.
 * 
 * SECURITY ARCHITECTURE:
 * - S3 bucket is PRIVATE (no public access)
 * - File keys are stored in database (NOT URLs)
 * - URLs are generated at read-time, not write-time
 * - CloudFront is used for public distribution
 * - Presigned S3 URLs for temporary/secure access
 * 
 * WHY SEPARATE SERVICE:
 * - UploadService handles write operations
 * - FileAccessService handles read operations
 * - Clear separation of concerns
 * - Easy to switch between CloudFront/presigned URLs
 * 
 * PRODUCTION NOTES:
 * - In development: Uses CloudFront or presigned URLs
 * - In production: Should use CloudFront signed URLs (future enhancement)
 * - CloudFront caching improves performance and reduces S3 costs
 */
export class FileAccessService {
  /**
   * Get public URL for a file via CloudFront
   * 
   * WHEN TO USE:
   * - Public files (avatars, message attachments)
   * - Files that can be cached
   * - Long-lived URLs (stored in API responses)
   * 
   * SECURITY:
   * - CloudFront sits in front of private S3 bucket
   * - Origin Access Identity (OAI) prevents direct S3 access
   * - Optional: CloudFront signed URLs for time-limited access (not yet implemented)
   * 
   * @param fileKey - S3 object key (e.g., "attachment/userId/timestamp-file.jpg")
   * @returns CloudFront URL or presigned S3 URL (fallback)
   */
  getPublicUrl(fileKey: string): string {
    if (!fileKey) {
      throw new AppError('File key is required', 400);
    }

    // If CloudFront is configured, use it (recommended for production)
    if (config.aws.cloudFrontUrl) {
      const cloudFrontUrl = config.aws.cloudFrontUrl.replace(/\/$/, ''); // Remove trailing slash
      return `${cloudFrontUrl}/${fileKey}`;
    }

    // Fallback: Return raw S3 URL (only works if bucket is public - NOT RECOMMENDED)
    // In development, you might make bucket public temporarily
    console.warn('⚠️  CloudFront URL not configured. Using direct S3 URL (requires public bucket)');
    return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${fileKey}`;
  }

  /**
   * Generate a temporary presigned URL for secure file access
   * 
   * WHEN TO USE:
   * - Sensitive/private files
   * - Files that should NOT be cached
   * - Time-limited access (e.g., temporary downloads)
   * - When CloudFront signed URLs are not available
   * 
   * SECURITY:
   * - URL expires after specified time (default: 1 hour)
   * - No caching
   * - Direct S3 access (slower than CloudFront)
   * 
   * @param fileKey - S3 object key
   * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @returns Presigned S3 GET URL
   */
  async generatePresignedUrl(fileKey: string, expiresIn: number = 3600): Promise<string> {
    if (!fileKey) {
      throw new AppError('File key is required', 400);
    }

    const command = new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileKey,
    });

    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      throw new AppError('Failed to generate download URL', 500);
    }
  }

  /**
   * Get download URL with proper Content-Disposition header
   * Forces browser to download file instead of displaying it
   * 
   * @param fileKey - S3 object key
   * @param fileName - Original file name (for download)
   * @param expiresIn - URL expiration in seconds
   * @returns Presigned URL with Content-Disposition header
   */
  async generateDownloadUrl(
    fileKey: string,
    fileName?: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (!fileKey) {
      throw new AppError('File key is required', 400);
    }

    const command = new GetObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileKey,
      ResponseContentDisposition: fileName 
        ? `attachment; filename="${fileName}"` 
        : 'attachment',
    });

    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Failed to generate download URL:', error);
      throw new AppError('Failed to generate download URL', 500);
    }
  }

  /**
   * Batch convert file keys to URLs
   * Useful for API responses with multiple files
   * 
   * @param fileKeys - Array of S3 object keys
   * @returns Array of CloudFront URLs
   */
  getPublicUrls(fileKeys: string[]): string[] {
    return fileKeys.filter(Boolean).map((key) => this.getPublicUrl(key));
  }

  /**
   * Check if file is an image (for frontend preview logic)
   * 
   * @param fileKey - S3 object key
   * @returns true if file appears to be an image
   */
  isImageFile(fileKey: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const lowerKey = fileKey.toLowerCase();
    return imageExtensions.some((ext) => lowerKey.endsWith(ext));
  }

  /**
   * Extract file name from S3 key
   * Format: "attachment/userId/timestamp-randomId-fileName.ext"
   * 
   * @param fileKey - S3 object key
   * @returns Original file name (best effort)
   */
  getFileNameFromKey(fileKey: string): string {
    const parts = fileKey.split('/');
    const lastPart = parts[parts.length - 1];
    
    // Remove timestamp and random ID prefix
    const match = lastPart.match(/^\d+-[a-f0-9]+-(.+)$/);
    return match ? match[1] : lastPart;
  }
}

export default new FileAccessService();
