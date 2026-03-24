import { UserAvatar } from '../common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Search, MoreVertical, ArrowLeft, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  participantCount?: number;
  onBackClick?: () => void;
  onSearchClick?: () => void;
  onMediaClick?: () => void;
  className?: string;
}

export function ChatHeader({
  name,
  avatar,
  isOnline,
  isTyping,
  participantCount,
  onBackClick,
  onSearchClick,
  onMediaClick,
  className
}: ChatHeaderProps) {
  return (
    <div className={cn('bg-card border-b border-border px-4 py-3', className)}>
      <div className="flex items-center gap-3">
        {onBackClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackClick}
            className="lg:hidden -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <UserAvatar src={avatar} name={name} size="md" online={isOnline} />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-card-foreground truncate">{name}</h2>
          <p className="text-sm text-muted-foreground">
            {isTyping ? (
              <span className="text-primary">typing...</span>
            ) : isOnline !== undefined ? (
              isOnline ? 'Online' : 'Offline'
            ) : participantCount !== undefined ? (
              `${participantCount} participant${participantCount !== 1 ? 's' : ''}`
            ) : (
              'Click to view info'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMediaClick}>
            <Image className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={onSearchClick}>
            <Search className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
