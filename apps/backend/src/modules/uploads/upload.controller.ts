import { Request, Response, NextFunction } from 'express';
import uploadService from './upload.service.js';
import fileAccessService from './file-access.service.js';
import AppError from '../../utils/AppError.js';

/**
 * Upload Controller
 * Handles file upload requests with AWS S3
 * 
 * ARCHITECTURE NOTES:
 * - UploadService: Handles S3 write operations (upload, delete)
 * - FileAccessService: Handles URL generation for file access
 * - Controllers: Combine both services for complete workflows
 * 
 * SECURITY:
 * - Only file keys are stored in database
 * - URLs are generated at request time
 * - Upload URLs (presigned PUT) ≠ Download URLs (CloudFront/presigned GET)
 */
export class UploadController {
  /**
   * Generate presigned URL for client-side direct upload
   * 
   * WORKFLOW:
   * 1. Client requests presigned URL with file metadata
   * 2. Backend validates and generates time-limited PUT URL
   * 3. Client uploads directly to S3 using this URL
   * 4. Client stores fileKey in database
   * 5. When displaying file, use fileKey to get public URL via FileAccessService
   * 
   * RESPONSE FORMAT (BACKWARD COMPATIBLE):
   * - uploadUrl: Presigned PUT URL (for client upload)
   * - fileKey: S3 object key (store this in DB)
   * - fileUrl: CloudFront URL (for immediate preview - optional)
   * 
   * @route POST /api/v1/uploads/presigned-url
   */
  async generatePresignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileName, fileType, uploadType } = req.body;
      const userId = req.userId!;

      // Validate request body
      if (!fileName || !fileType || !uploadType) {
        throw new AppError('fileName, fileType, and uploadType are required', 400);
      }

      if (!['avatar', 'attachment'].includes(uploadType)) {
        throw new AppError('uploadType must be either "avatar" or "attachment"', 400);
      }

      // Generate presigned upload URL and file key
      const { uploadUrl, fileKey } = await uploadService.generatePresignedUploadUrl(
        userId,
        fileName,
        fileType,
        uploadType as 'avatar' | 'attachment'
      );

      // Generate public access URL via CloudFront
      // NOTE: This URL is for immediate preview/display after upload
      // The fileKey should be stored in DB, not this URL
      const fileUrl = fileAccessService.getPublicUrl(fileKey);

      res.status(200).json({
        success: true,
        data: {
          uploadUrl,  // Use this to upload file
          fileKey,    // Store this in database
          fileUrl,    // Use this for preview (generated from fileKey)
        },
        message: 'Presigned URL generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload file directly through the server (alternative method)
   * 
   * WHEN TO USE:
   * - Server-side image processing (resize, optimize)
   * - File validation before upload
   * - Legacy clients that don't support presigned URLs
   * 
   * NOTE: Less efficient than presigned URL method (file goes through server)
   * 
   * @route POST /api/v1/uploads/direct
   */
  async uploadFileDirect(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const { uploadType } = req.body;
      const userId = req.userId!;

      if (!['avatar', 'attachment'].includes(uploadType)) {
        throw new AppError('uploadType must be either "avatar" or "attachment"', 400);
      }

      // Upload file and get key
      const { fileKey } = await uploadService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        userId,
        uploadType as 'avatar' | 'attachment'
      );

      // Generate public URL for immediate use
      const fileUrl = fileAccessService.getPublicUrl(fileKey);

      res.status(200).json({
        success: true,
        data: {
          fileKey,  // Store this in database
          fileUrl,  // Use this for display (generated from fileKey)
        },
        message: 'File uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an uploaded file
   * @route DELETE /api/v1/uploads/:fileKey
   */
  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileKey } = req.params;

      if (!fileKey) {
        throw new AppError('fileKey is required', 400);
      }

      // Decode the fileKey (it might be URL encoded)
      const decodedKey = decodeURIComponent(fileKey);

      await uploadService.deleteFile(decodedKey);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate presigned download URL for a file
   * 
   * USE CASES:
   * - Temporary secure access to private files
   * - Force download (with Content-Disposition header)
   * - Time-limited sharing
   * 
   * ALTERNATIVE: Use FileAccessService.getPublicUrl() for public files via CloudFront
   * 
   * @route GET /api/v1/uploads/download/:fileKey
   */
  async generateDownloadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileKey } = req.params;

      if (!fileKey) {
        throw new AppError('fileKey is required', 400);
      }

      const decodedKey = decodeURIComponent(fileKey);
      const downloadUrl = await fileAccessService.generatePresignedUrl(decodedKey);

      res.status(200).json({
        success: true,
        data: { downloadUrl },
        message: 'Download URL generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public URL for a file key (via CloudFront)
   * 
   * UTILITY ENDPOINT:
   * - Convert stored file keys to accessible URLs
   * - Useful for batch operations or migrations
   * 
   * NOTE: In most cases, frontend should construct URLs from keys directly
   * using the CloudFront base URL
   * 
   * @route GET /api/v1/uploads/url/:fileKey
   */
  async getPublicUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileKey } = req.params;

      if (!fileKey) {
        throw new AppError('fileKey is required', 400);
      }

      const decodedKey = decodeURIComponent(fileKey);
      const publicUrl = fileAccessService.getPublicUrl(decodedKey);

      res.status(200).json({
        success: true,
        data: { 
          fileKey: decodedKey,
          publicUrl 
        },
        message: 'Public URL generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UploadController();
