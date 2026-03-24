import { IChatRequest } from './chat-request.interface.js';

export interface ChatRequestDTO {
  id: string;
  senderId: string;
  receiverId: string;
  senderUsername?: string;
  senderAvatar?: string;
  senderEmail?: string;
  receiverUsername?: string;
  receiverAvatar?: string;
  receiverEmail?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendChatRequestDTO {
  receiverEmail: string;
}

export interface AcceptRequestResponseDTO {
  request: ChatRequestDTO;
  conversationId: string;
}

export class ChatRequestMapper {
  static toDTO(request: IChatRequest): ChatRequestDTO {
    const sender = request.senderId as any;
    const receiver = request.receiverId as any;

    return {
      id: request._id.toString(),
      senderId: typeof sender === 'string' ? sender : sender._id.toString(),
      receiverId: typeof receiver === 'string' ? receiver : receiver._id.toString(),
      senderUsername: sender?.username,
      senderAvatar: sender?.avatar,
      senderEmail: sender?.email,
      receiverUsername: receiver?.username,
      receiverAvatar: receiver?.avatar,
      receiverEmail: receiver?.email,
      status: request.status,
      respondedAt: request.respondedAt?.toISOString(),
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  static toDTOArray(requests: IChatRequest[]): ChatRequestDTO[] {
    return requests.map(this.toDTO);
  }
}
