// HTTP Client
export { createClient } from './http/createClient.js';
export type { HttpClient, HttpClientConfig, RequestOptions } from './http/types.js';
export { ApiError, isApiError, normalizeError } from './http/errors.js';

// Endpoints
export { createUserEndpoints } from './endpoints/users.js';
export { createConversationEndpoints } from './endpoints/conversations.js';
export type { ListConversationsOptions } from './endpoints/conversations.js';
export { createMessageEndpoints } from './endpoints/messages.js';
export type { ListMessagesOptions } from './endpoints/messages.js';
export { createChatRequestEndpoints } from './endpoints/chat-requests.js';
export type { ListChatRequestsOptions } from './endpoints/chat-requests.js';

// Types - User
export type {
  User,
  GetUserResponse,
  BlockUserResponse,
  UnblockUserResponse,
  DeleteAccountResponse,
} from './types/user.js';

// Types - Conversation
export type {
  ConversationType,
  LastMessage,
  Conversation,
  ListConversationsResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  GetConversationResponse,
  DeleteConversationResponse,
} from './types/conversation.js';

// Types - Message
export type {
  DeliveryState,
  MessageType,
  Message,
  ListMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  GetUnreadCountResponse,
  MarkAsReadResponse,
  DeleteMessageResponse,
  MessageSearchResult,
  SearchMessagesResponse,
  MessagesAroundResponse,
} from './types/message.js';

// Types - Chat Request
export type {
  ChatRequestStatus,
  ChatRequest,
  SendChatRequestRequest,
  SendChatRequestResponse,
  ListChatRequestsResponse,
  AcceptChatRequestResponse,
  DeclineChatRequestResponse,
  BlockSenderResponse,
} from './types/chat-request.js';

// Convenience: Create API client with all endpoints
import { createClient } from './http/createClient.js';
import { createUserEndpoints } from './endpoints/users.js';
import { createConversationEndpoints } from './endpoints/conversations.js';
import { createMessageEndpoints } from './endpoints/messages.js';
import { createChatRequestEndpoints } from './endpoints/chat-requests.js';
import type { HttpClientConfig } from './http/types.js';

export function createApiClient(config: HttpClientConfig) {
  const client = createClient(config);

  return {
    client,
    users: createUserEndpoints(client),
    conversations: createConversationEndpoints(client),
    messages: createMessageEndpoints(client),
    chatRequests: createChatRequestEndpoints(client),
  };
}

