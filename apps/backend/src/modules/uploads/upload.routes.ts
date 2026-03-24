import { Router } from 'express';
import multer from 'multer';
import uploadController from './upload.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { uploadLimiter } from '../../middlewares/rate-limit.middleware.js';
import { body, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError.js';

const router: Router = Router();

// Apply upload rate limiter to all upload routes (10 uploads per hour)
router.use(protect); // Authentication required for uploads
router.use(uploadLimiter); // Rate limiting for uploads

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }
  next();
};

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

/**
 * @swagger
 * /api/v1/uploads/presigned-url:
 *   post:
 *     summary: Generate presigned URL for direct S3 upload
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileName
 *               - fileType
 *               - uploadType
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "profile-pic.jpg"
 *               fileType:
 *                 type: string
 *                 example: "image/jpeg"
 *               uploadType:
 *                 type: string
 *                 enum: [avatar, attachment]
 *                 example: "avatar"
 *     responses:
 *       200:
 *         description: Presigned URL generated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/presigned-url',
  protect,
  [
    body('fileName').trim().notEmpty().withMessage('fileName is required'),
    body('fileType').trim().notEmpty().withMessage('fileType is required'),
    body('uploadType')
      .trim()
      .isIn(['avatar', 'attachment'])
      .withMessage('uploadType must be either "avatar" or "attachment"'),
    validate,
  ],
  uploadController.generatePresignedUrl.bind(uploadController)
);

/**
 * @swagger
 * /api/v1/uploads/direct:
 *   post:
 *     summary: Upload file directly through server
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - uploadType
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               uploadType:
 *                 type: string
 *                 enum: [avatar, attachment]
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/direct',
  protect,
  upload.single('file'),
  [
    body('uploadType')
      .trim()
      .isIn(['avatar', 'attachment'])
      .withMessage('uploadType must be either "avatar" or "attachment"'),
    validate,
  ],
  uploadController.uploadFileDirect.bind(uploadController)
);

/**
 * @swagger
 * /api/v1/uploads/{fileKey}:
 *   delete:
 *     summary: Delete an uploaded file
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 file key (URL encoded)
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/:fileKey',
  protect,
  uploadController.deleteFile.bind(uploadController)
);

/**
 * @swagger
 * /api/v1/uploads/download/{fileKey}:
 *   get:
 *     summary: Generate presigned download URL
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 file key (URL encoded)
 *     responses:
 *       200:
 *         description: Download URL generated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/download/:fileKey',
  protect,
  uploadController.generateDownloadUrl.bind(uploadController)
);

/**
 * @swagger
 * /api/v1/uploads/url/{fileKey}:
 *   get:
 *     summary: Get public CloudFront URL for a file key
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileKey
 *         required: true
 *         schema:
 *           type: string
 *         description: S3 file key (URL encoded)
 *     responses:
 *       200:
 *         description: Public URL generated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/url/:fileKey',
  protect,
  uploadController.getPublicUrl.bind(uploadController)
);

export default router;
