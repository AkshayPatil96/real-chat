import { Request, Response, NextFunction } from 'express';
import { IUserService } from './user.interface.js';
import UserService from './user.service.js';
import { UserMapper } from './user.dto.js';

export class UserController {
  constructor(private userService: IUserService = UserService) { }

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID from auth middleware

      const user = await this.userService.getUserById(userId);

      res.json({ user: UserMapper.toDTO(user) });
    } catch (error) {
      next(error);
    }
  };

  blockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID
      const { targetUserId } = req.params;

      await this.userService.blockUser(userId, targetUserId);

      res.json({ message: 'User blocked successfully' });
    } catch (error) {
      next(error);
    }
  };

  unblockUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID
      const { targetUserId } = req.params;

      await this.userService.unblockUser(userId, targetUserId);

      res.json({ message: 'User unblocked successfully' });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!; // MongoDB user ID

      await this.userService.deleteAccount(userId);

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      next(error);
    }
  };
}

export default new UserController();
