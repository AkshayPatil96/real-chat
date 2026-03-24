/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSendChatRequestMutation } from "@/store/api";
import { Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendRequestDialog({
  open,
  onOpenChange,
}: SendRequestDialogProps) {
  const [email, setEmail] = useState("");
  const [sendRequest, { isLoading }] = useSendChatRequestMutation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendRequest({ receiverEmail: email }).unwrap();
      toast({
        title: "Request sent",
        description: `Chat request sent to ${email}`,
      });
      setEmail("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to send request",
        description: error?.data?.error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setEmail("");
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-425px">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Send Chat Request
          </DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to chat with.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEmail("");
                onOpenChange(false);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
