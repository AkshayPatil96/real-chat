/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "../common/UserAvatar";
import { Check, X, Loader2 } from "lucide-react";
import {
  useListIncomingRequestsQuery,
  useAcceptChatRequestMutation,
  useDeclineChatRequestMutation,
  type ChatRequest,
} from "@/store/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function ChatRequestsList() {
  const { isTokenReady } = useAuth();
  const { data: requests, isLoading } = useListIncomingRequestsQuery({}, { skip: !isTokenReady });
  const [acceptRequest, { isLoading: isAccepting }] =
    useAcceptChatRequestMutation();
  const [declineRequest, { isLoading: isDeclining }] =
    useDeclineChatRequestMutation();
  const { toast } = useToast();

  const handleAccept = async (requestId: string) => {
    try {
      await acceptRequest(requestId).unwrap();
      toast({
        title: "Request accepted",
        description: "You can now start chatting!",
      });
    } catch (error: any) {
      toast({
        title: "Failed to accept request",
        description: error?.data?.error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      await declineRequest(requestId).unwrap();
      toast({
        title: "Request declined",
        description: "Chat request has been declined",
      });
    } catch (error: any) {
      toast({
        title: "Failed to decline request",
        description: error?.data?.error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !requests || requests.length === 0) {
    return null;
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="border-b"
    >
      <AccordionItem
        value="chat-requests"
        className="border-none"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Chat Requests</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {requests.length}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-0">
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y">
              {requests.map((request) => (
                <ChatRequestItem
                  key={request.id}
                  request={request}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  isAccepting={isAccepting}
                  isDeclining={isDeclining}
                />
              ))}
            </div>
          </ScrollArea>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

interface ChatRequestItemProps {
  request: ChatRequest;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  isAccepting: boolean;
  isDeclining: boolean;
}

function ChatRequestItem({
  request,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: ChatRequestItemProps) {
  const isLoading = isAccepting || isDeclining;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
      <UserAvatar
        src={request.senderAvatar}
        name={request.senderUsername || "User"}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {request.senderUsername || request.senderEmail}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {request.senderEmail}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(request.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
          onClick={() => onAccept(request.id)}
          disabled={isLoading}
        >
          {isAccepting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={() => onDecline(request.id)}
          disabled={isLoading}
        >
          {isDeclining ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
