import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError.js';

export const validateSendMessage = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ max: 5000 })
    .withMessage('Content too long'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];

export const validateConversationId = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];

export const validateMessageId = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];
