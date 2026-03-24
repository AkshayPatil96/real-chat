import { UserDTO as SharedUserDTO, CreateUserDTO as SharedCreateUserDTO, UpdateUserDTO as SharedUpdateUserDTO } from '@repo/shared-types';
import { IUser } from './user.interface.js';

// Re-export shared types
export type UserDTO = SharedUserDTO;
export type CreateUserDTO = SharedCreateUserDTO;
export type UpdateUserDTO = SharedUpdateUserDTO;

// Mapper functions
export class UserMapper {
  static toDTO(user: IUser): UserDTO {
    return {
      id: user._id.toString(),
      clerkId: user.clerkId,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  static toDTOArray(users: IUser[]): UserDTO[] {
    return users.map(this.toDTO);
  }
}
