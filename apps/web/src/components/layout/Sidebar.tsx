import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConversationList } from "../conversation/ConversationList";
import { ChatRequestsList } from "../chat/ChatRequestsList";
import { SendRequestDialog } from "../chat/SendRequestDialog";
import { UserAvatar } from "../common/UserAvatar";
import { Search, Plus, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton, useClerk } from "@clerk/clerk-react";
import { ModeToggle } from "../ui/theme-provider";
import { Link } from "react-router-dom";

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isTyping?: boolean;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationClick: (id: string) => void;
  loading?: boolean;
  currentUser?: {
    name: string;
    avatar?: string;
    email?: string;
  };
  onNewChat?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onConversationClick,
  loading,
  currentUser,
  onLogout,
  className,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSendRequestDialog, setShowSendRequestDialog] = useState(false);
  const { openUserProfile } = useClerk();
  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <aside
      className={cn(
        "w-full lg:w-96 bg-sidebar-background border-r border-border",
        "flex flex-col h-full",
        className,
      )}
    >
      <div className="bg-card border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2"
          >
            <h1 className="text-xl font-bold text-sidebar-foreground">
              RealChat
            </h1>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowSendRequestDialog(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>

            <ModeToggle />

            {/* <UserButton /> */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                >
                  <UserAvatar
                    src={currentUser?.avatar}
                    name={currentUser?.name || "User"}
                    size="sm"
                    showOnlineStatus={false}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56"
              >
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openUserProfile()}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {onLogout && (
                  <SignOutButton>
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </SignOutButton>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchQuery(e.target.value)
            }
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <ChatRequestsList />
        <ConversationList
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          onConversationClick={onConversationClick}
          loading={loading}
          onAddContact={() => setShowSendRequestDialog(true)}
        />
      </div>

      <SendRequestDialog
        open={showSendRequestDialog}
        onOpenChange={setShowSendRequestDialog}
      />
    </aside>
  );
}
