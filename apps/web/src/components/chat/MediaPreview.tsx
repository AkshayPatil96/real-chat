import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { MediaUploadState } from '@/hooks/useMediaUpload';

interface MediaPreviewProps {
  uploadState: MediaUploadState;
  onRemove: () => void;
}

export function MediaPreview({ uploadState, onRemove }: MediaPreviewProps) {
  const { file, localPreviewUrl, uploadStatus, uploadProgress, error } = uploadState;

  return (
    <div className="mb-3 p-3 bg-muted rounded-lg">
      <div className="flex items-start gap-3">
        {/* Image Preview */}
        <div className="relative w-20 h-20 rounded-md overflow-hidden bg-background shrink-0">
          {file.type.startsWith('image/') && localPreviewUrl && (
            <img
              src={localPreviewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Status Overlay */}
          {uploadStatus === 'UPLOADING' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          
          {uploadStatus === 'FAILED' && (
            <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          )}
          
          {uploadStatus === 'UPLOADED' && (
            <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* File Info and Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Upload Progress */}
          {uploadStatus === 'UPLOADING' && (
            <div className="mt-2 space-y-1">
              <Progress value={uploadProgress} className="h-1" />
              <p className="text-xs text-muted-foreground">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Upload Status Messages */}
          {uploadStatus === 'PREVIEW_READY' && (
            <p className="text-xs text-muted-foreground mt-1">
              Starting upload...
            </p>
          )}

          {uploadStatus === 'UPLOADED' && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Upload complete
            </p>
          )}

          {uploadStatus === 'FAILED' && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error || 'Upload failed'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
