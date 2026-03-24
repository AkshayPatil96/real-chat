import { X, FileText, File as FileIcon, Video, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UploadedFile, FileUploadType } from '@/hooks/useFileUpload';
import { Card } from '../ui/card';

interface FilePreviewProps {
  file: UploadedFile;
  onRemove: () => void;
  uploading?: boolean;
}

/**
 * Get icon for file type
 */
const getFileIcon = (type: FileUploadType) => {
  switch (type) {
    case 'image':
      return <Image className="h-6 w-6" />;
    case 'video':
      return <Video className="h-6 w-6" />;
    case 'pdf':
      return <FileText className="h-6 w-6" />;
    case 'document':
    case 'spreadsheet':
      return <FileIcon className="h-6 w-6" />;
    default:
      return <FileIcon className="h-6 w-6" />;
  }
};

/**
 * Format file size
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * FilePreview Component
 * Displays a preview of the selected file before sending
 * Supports images with thumbnails and other files with icons
 */
export function FilePreview({ file, onRemove, uploading }: FilePreviewProps) {
  const isImage = file.type === 'image';

  return (
    <Card className="relative mb-2 p-2">
      <div className="flex items-center gap-3">
        {/* Preview/Icon */}
        <div className="shrink-0">
          {isImage && file.preview ? (
            <div className="relative h-16 w-16 rounded overflow-hidden bg-muted">
              <img
                src={file.preview}
                alt={file.file.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-muted-foreground">
              {getFileIcon(file.type)}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.file.size)}
            {uploading && ' • Uploading...'}
          </p>
        </div>

        {/* Remove Button */}
        {!uploading && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={onRemove}
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Uploading...</span>
          </div>
        </div>
      )}
    </Card>
  );
}
