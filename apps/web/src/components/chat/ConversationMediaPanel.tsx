import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaGrid } from './MediaGrid';
import { DocumentsList } from './DocumentsList';
import { LinksList } from './LinksList';

interface ConversationMediaPanelProps {
  conversationId: string;
  onImageClick?: (messageId: string) => void;
}

/**
 * Media/Docs/Links panel for a conversation
 * WhatsApp-style media browser with tabs
 * 
 * Features:
 * - Independent pagination from chat
 * - Grid view for media
 * - List view for docs/links
 * - Opens image viewer on image click
 */
export function ConversationMediaPanel({
  conversationId,
  onImageClick,
}: ConversationMediaPanelProps) {
  const [activeTab, setActiveTab] = useState<'media' | 'docs' | 'links'>('media');

  return (
    <div className="h-full flex flex-col">
      <Tabs
        value={activeTab}
        onValueChange={(value: string) => setActiveTab(value as 'media' | 'docs' | 'links')}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="flex-1 overflow-hidden">
          <MediaGrid
            conversationId={conversationId}
            onImageClick={onImageClick}
          />
        </TabsContent>

        <TabsContent value="docs" className="flex-1 overflow-hidden">
          <DocumentsList conversationId={conversationId} />
        </TabsContent>

        <TabsContent value="links" className="flex-1 overflow-hidden">
          <LinksList conversationId={conversationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
