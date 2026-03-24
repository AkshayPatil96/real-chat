import { PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../../config/aws.js';
import { config } from '../../config/env.js';
import crypto from 'crypto';
import path from 'path';
import AppError from '../../utils/AppError.js';

/**
 * File Upload Service using AWS S3
 * 
 * Production Hardening Features:
 * - Presigned URLs for secure direct uploads
 * - File type validation
 * - Size limits enforced
 * - Unique file naming to prevent collisions
 * - Organized folder structure by upload type
 * 
 * Supported Upload Types:
 * - avatars: User profile pictures (max 5MB, jpg/png/webp)
 * - attachments: Message attachments (max 25MB, various formats)
 */
export class UploadService {
  private readonly MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB
  
  private readonly ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly ALLOWED_ATTACHMENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  /**
   * Generate a presigned URL for direct upload to S3
   * 
   * SECURITY: Returns ONLY upload URL and file key.
   * - Upload URLs are presigned PUT URLs (write-only, time-limited)
   * - File keys are stored in database for later retrieval
   * - Download/access URLs are generated separately via FileAccessService
   * - Files are uploaded to temp/ prefix for safety
   * 
   * @param userId - User ID for folder organization
   * @param fileName - Original file name
   * @param fileType - MIME type
   * @param uploadType - Type of upload (avatar, attachment)
   * @returns Presigned upload URL and file key (NO public URL)
   */
  async generatePresignedUploadUrl(
    userId: string,
    fileName: string,
    fileType: string,
    uploadType: 'avatar' | 'attachment'
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    // Validate file type
    this.validateFileType(fileType, uploadType);

    // Generate unique file key with temp/ prefix
    const fileKey = this.generateTempFileKey(userId, fileName, uploadType);

    // Create S3 command
    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileKey,
      ContentType: fileType,
    });

    try {
      // Generate presigned URL (expires in 5 minutes)
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

      return { uploadUrl, fileKey };
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      throw new AppError('Failed to generate upload URL', 500);
    }
  }

  /**
   * Upload file directly to S3 (for server-side uploads)
   * 
   * SECURITY: Returns ONLY file key.
   * - Used for server-side uploads (e.g., avatar processing)
   * - File key is stored in database
   * - Access URLs are generated via FileAccessService when needed
   * 
   * @param file - File buffer
   * @param fileName - Original file name
   * @param fileType - MIME type
   * @param userId - User ID
   * @param uploadType - Type of upload
   * @returns File key (NO public URL)
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    fileType: string,
    userId: string,
    uploadType: 'avatar' | 'attachment'
  ): Promise<{ fileKey: string }> {
    // Validate file type and size
    this.validateFileType(fileType, uploadType);
    this.validateFileSize(file.length, uploadType);

    // Generate unique file key (direct upload without temp/)
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
    const fileKey = `${uploadType}/${userId}/${timestamp}-${randomId}-${sanitizedBaseName}${ext}`;

    const command = new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileKey,
      Body: file,
      ContentType: fileType,
    });

    try {
      await s3Client.send(command);

      return { fileKey };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw new AppError('Failed to upload file', 500);
    }
  }

  /**
   * Delete file from S3
   * @param fileKey - S3 file key
   */
  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: fileKey,
    });

    try {
      await s3Client.send(command);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw new AppError('Failed to delete file', 500);
    }
  }

  /**
   * Move file from temp/ to final location
   * Used when message is actually sent
   * 
   * @param tempFileKey - Temporary file key (temp/...)
   * @returns Final file key (without temp/ prefix)
   */
  async moveFromTemp(tempFileKey: string): Promise<string> {
    // Extract the path without temp/ prefix
    if (!tempFileKey.startsWith('temp/')) {
      throw new AppError('File key must start with temp/', 400);
    }

    const finalKey = tempFileKey.replace(/^temp\//, '');

    try {
      // Copy object to final location
      const copyCommand = new CopyObjectCommand({
        Bucket: config.aws.s3Bucket,
        CopySource: `${config.aws.s3Bucket}/${tempFileKey}`,
        Key: finalKey,
      });

      await s3Client.send(copyCommand);

      // Delete original temp file
      await this.deleteFile(tempFileKey);

      return finalKey;
    } catch (error) {
      console.error('Failed to move file from temp:', error);
      throw new AppError('Failed to finalize file upload', 500);
    }
  }

  /**
   * Generate unique file key with temp/ prefix
   * Format: temp/{uploadType}/{userId}/{timestamp}-{randomId}-{fileName}
   */
  private generateTempFileKey(userId: string, fileName: string, uploadType: string): string {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);

    return `temp/${uploadType}/${userId}/${timestamp}-${randomId}-${sanitizedBaseName}${ext}`;
  }

  /**
   * Validate file type based on upload type
   */
  private validateFileType(fileType: string, uploadType: 'avatar' | 'attachment'): void {
    const allowedTypes = uploadType === 'avatar' ? this.ALLOWED_AVATAR_TYPES : this.ALLOWED_ATTACHMENT_TYPES;

    if (!allowedTypes.includes(fileType)) {
      throw new AppError(
        `Invalid file type. Allowed types for ${uploadType}: ${allowedTypes.join(', ')}`,
        400
      );
    }
  }

  /**
   * Validate file size
   */
  private validateFileSize(fileSize: number, uploadType: 'avatar' | 'attachment'): void {
    const maxSize = uploadType === 'avatar' ? this.MAX_AVATAR_SIZE : this.MAX_ATTACHMENT_SIZE;

    if (fileSize > maxSize) {
      throw new AppError(
        `File too large. Maximum size for ${uploadType}: ${maxSize / 1024 / 1024}MB`,
        400
      );
    }
  }
}

export default new UploadService();
