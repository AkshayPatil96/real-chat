import { Request, Response, NextFunction } from 'express';
import { IChatRequestService } from './chat-request.interface.js';
import ChatRequestService from './chat-request.service.js';
import { ChatRequestMapper } from './chat-request.dto.js';

export class ChatRequestController {
  constructor(private chatRequestService: IChatRequestService = ChatRequestService) { }

  sendRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { receiverEmail } = req.body;

      const request = await this.chatRequestService.sendRequest(userId, receiverEmail);

      res.status(201).json({
        request: ChatRequestMapper.toDTO(request),
      });
    } catch (error) {
      next(error);
    }
  };

  listIncoming = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req?.userId ?? ''; // MongoDB user ID
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const requests = await this.chatRequestService.listIncomingRequests(userId, page, limit);

      res.json({
        requests: ChatRequestMapper.toDTOArray(requests),
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  };

  listOutgoing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const requests = await this.chatRequestService.listOutgoingRequests(userId, page, limit);

      res.json({
        requests: ChatRequestMapper.toDTOArray(requests),
        page,
        limit,
      });
    } catch (error) {
      next(error);
    }
  };

  acceptRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { requestId } = req.params;

      const result = await this.chatRequestService.acceptRequest(requestId, userId);

      res.json({
        request: ChatRequestMapper.toDTO(result.request),
        conversationId: result.conversationId,
      });
    } catch (error) {
      next(error);
    }
  };

  declineRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { requestId } = req.params;

      const request = await this.chatRequestService.declineRequest(requestId, userId);

      res.json({
        request: ChatRequestMapper.toDTO(request),
      });
    } catch (error) {
      next(error);
    }
  };

  blockSender = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // MongoDB user ID
      const { requestId } = req.params;

      const request = await this.chatRequestService.blockSender(requestId, userId);

      res.json({
        request: ChatRequestMapper.toDTO(request),
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new ChatRequestController();
