import { MessageDTO as SharedMessageDTO, SendMessageDTO as SharedSendMessageDTO } from '@repo/shared-types';
import { IMessage } from './message.interface.js';
import { IUser } from '../users/user.interface.js';
import mongoose from 'mongoose';

export type MessageDTO = SharedMessageDTO;
export type SendMessageDTO = SharedSendMessageDTO;

export class MessageMapper {
  static toDTO(message: IMessage): MessageDTO {
    return {
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      senderId: {
        id: (message.senderId as IUser)._id.toString(),
        username: (message.senderId as IUser).username,
        avatar: (message.senderId as IUser).avatar,
      },
      content: message.content ?? '',
      attachment: message.media
        ? {
          fileUrl: message.media.url,
          fileKey: '', // Not stored in message, so leave empty
          fileName: message.media.name,
          fileSize: message.media.size,
          fileType: message.media.mimeType,
        }
        : undefined,
      type: message.type || 'text',
      deliveryState: message.deliveryState,
      readBy: message.readBy.map((id: any) => id.toString()),
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
    };
  }

  static toDTOArray(messages: IMessage[]): MessageDTO[] {
    return messages.map(this.toDTO);
  }
}
