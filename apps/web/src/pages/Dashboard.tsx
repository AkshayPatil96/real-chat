// import { useAuth, useUser } from "@clerk/clerk-react";
import { ChatContainer } from "@/components/layout/ChatContainer";
import { useAuth } from "@/hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user || !user.id) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ChatContainer
      currentUserId={user.id}
      currentUser={{
        name: user.username || "User",
        email: user.email,
        avatar: user.avatar,
      }}
    />
  );
}
