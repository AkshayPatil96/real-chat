import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError.js';

export const validateCreateConversation = [
  body('otherUserId')
    .isMongoId()
    .withMessage('Invalid user ID'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];

export const validateConversationId = [
  param('id')
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
