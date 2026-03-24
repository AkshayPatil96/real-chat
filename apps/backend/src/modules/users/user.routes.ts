import { Router } from 'express';
import UserController from './user.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { validateBlockUser, validateUnblockUser } from './user.validator.js';

const router: Router = Router();

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', UserController.getMe);

/**
 * @swagger
 * /api/v1/users/block/{targetUserId}:
 *   post:
 *     summary: Block a user
 *     tags: [Users]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of user to block
 *     responses:
 *       200:
 *         description: User blocked successfully
 *       400:
 *         description: Invalid user ID or cannot block yourself
 *       404:
 *         description: Target user not found
 */
router.post('/block/:targetUserId', validateBlockUser, UserController.blockUser);

/**
 * @swagger
 * /api/v1/users/block/{targetUserId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Users]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of user to unblock
 *     responses:
 *       200:
 *         description: User unblocked successfully
 *       400:
 *         description: Invalid user ID
 */
router.delete('/block/:targetUserId', validateUnblockUser, UserController.unblockUser);

/**
 * @swagger
 * /api/v1/users/me:
 *   delete:
 *     summary: Delete user account (soft delete)
 *     tags: [Users]
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
router.delete('/me', UserController.deleteAccount);

export default router;
