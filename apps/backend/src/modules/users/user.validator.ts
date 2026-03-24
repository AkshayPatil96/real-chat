import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError.js';

export const validateBlockUser = [
  param('targetUserId')
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

export const validateUnblockUser = [
  param('targetUserId')
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
