import { useState, useCallback, useRef } from 'react';
import axios, { type AxiosProgressEvent } from 'axios';
import { useGeneratePresignedUrlMutation } from '@/store/api/uploadsApi';

/**
 * Upload State Machine
 * IDLE → PREVIEW_READY → UPLOADING → UPLOADED
 *                    ↓ → FAILED
 *                    ↓ → CANCELED
 */
export type UploadStatus =
  | 'IDLE'
  | 'PREVIEW_READY'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'FAILED'
  | 'CANCELED';

export interface MediaUploadState {
  // File metadata
  file: File;
  localPreviewUrl: string; // blob URL for instant preview

  // Upload state
  uploadStatus: UploadStatus;
  uploadProgress: number; // 0-100
  fileKey?: string; // Only set after successful upload

  // Error handling
  error?: string;
}

export interface MediaUploadResult {
  fileKey: string;
  file: File;
  localPreviewUrl: string;
}

export function useMediaUpload() {
  const [generatePresignedUrl] = useGeneratePresignedUrlMutation();
  const [uploadState, setUploadState] = useState<MediaUploadState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadStateRef = useRef<MediaUploadState | null>(null);

  // Keep ref in sync with state
  uploadStateRef.current = uploadState;

  /**
   * Start upload process immediately on file selection
   * Creates local preview and begins S3 upload in background
   */
  const startUpload = useCallback(async (file: File): Promise<void> => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Only images are currently supported');
    }

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      throw new Error('File too large. Maximum size: 25MB');
    }

    // Create local preview immediately
    const localPreviewUrl = URL.createObjectURL(file);

    // Set initial state
    setUploadState({
      file,
      localPreviewUrl,
      uploadStatus: 'PREVIEW_READY',
      uploadProgress: 0,
    });
    console.log('uploadState after initial set: ', uploadState);
    // Start upload in background
    try {
      // Create new abort controller for this upload
      abortControllerRef.current = new AbortController();
      const abortSignal = abortControllerRef.current.signal;

      // Update state to uploading
      setUploadState(prev => {
        console.log('prev Update state to uploading: ', prev);
        return prev ? { ...prev, uploadStatus: 'UPLOADING' } : null
      });

      // 1. Get presigned URL (temp/ prefix)
      const presignedData = await generatePresignedUrl({
        fileName: file.name,
        fileType: file.type,
        uploadType: 'attachment',
      }).unwrap();

      const { uploadUrl, fileKey } = presignedData;
      console.log('uploadUrl: ', uploadUrl);
      console.log('fileKey: ', fileKey);

      // 2. Upload to S3 with progress tracking
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        signal: abortSignal,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          console.log('progressEvent: ', progressEvent);
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log('percentCompleted: ', percentCompleted);
            console.log('uploadState before onUploadProgress updates: ', uploadState);
            setUploadState(prev => {
              console.log('prev in onUploadProgress: ', prev);
              return prev ? { ...prev, uploadProgress: percentCompleted } : null
            }
            );
          }
        },
      });

      // 3. Upload successful
      setUploadState(prev => {
        console.log('Upload successful, prev: ', prev);
        return prev ? {
          ...prev,
          uploadStatus: 'UPLOADED',
          uploadProgress: 100,
          fileKey,
        } : null;
      });
    } catch (error) {
      // Check if upload was canceled
      if (axios.isCancel(error)) {
        setUploadState(prev => prev ? {
          ...prev,
          uploadStatus: 'CANCELED',
          error: 'Upload canceled',
        } : null);
        return;
      }

      // Upload failed
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => prev ? {
        ...prev,
        uploadStatus: 'FAILED',
        error: errorMessage,
      } : null);

      throw error;
    }
  }, [generatePresignedUrl]);

  /**
   * Cancel ongoing upload
   * Aborts HTTP request and calls backend delete (best effort)
   */
  const cancelUpload = useCallback(async () => {
    const currentState = uploadStateRef.current;
    if (!currentState) return;

    // Abort the upload request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Best-effort delete from S3 temp/
    if (currentState.fileKey) {
      try {
        // Call backend delete endpoint (don't await, best effort)
        fetch(`/api/v1/uploads/${encodeURIComponent(currentState.fileKey)}`, {
          method: 'DELETE',
        }).catch(() => {
          // Ignore errors - cleanup will happen via lifecycle rule
        });
      } catch {
        // Ignore - S3 lifecycle will clean up
      }
    }

    // Revoke blob URL
    if (currentState.localPreviewUrl) {
      URL.revokeObjectURL(currentState.localPreviewUrl);
    }

    // Reset state
    setUploadState(null);
    abortControllerRef.current = null;
  }, []);

  /**
   * Get upload result (when ready to send)
   * Returns undefined if upload not complete
   */
  const getUploadResult = useCallback((): MediaUploadResult | undefined => {
    const currentState = uploadStateRef.current;
    if (!currentState || currentState.uploadStatus !== 'UPLOADED' || !currentState.fileKey) {
      return undefined;
    }

    return {
      fileKey: currentState.fileKey,
      file: currentState.file,
      localPreviewUrl: currentState.localPreviewUrl,
    };
  }, []);

  /**
   * Wait for upload to complete
   * Used when user clicks send before upload finishes
   */
  const waitForUpload = useCallback(async (): Promise<MediaUploadResult> => {
    return new Promise((resolve, reject) => {
      // Use ref to get current state in polling loop (avoid stale closure)
      const getCurrentState = () => uploadStateRef.current;
      const currentState = getCurrentState();
      
      if (!currentState) {
        reject(new Error('No upload in progress'));
        return;
      }

      if (currentState.uploadStatus === 'UPLOADED' && currentState.fileKey) {
        resolve({
          fileKey: currentState.fileKey,
          file: currentState.file,
          localPreviewUrl: currentState.localPreviewUrl,
        });
        return;
      }

      if (currentState.uploadStatus === 'FAILED') {
        reject(new Error(currentState.error || 'Upload failed'));
        return;
      }

      if (currentState.uploadStatus === 'CANCELED') {
        reject(new Error('Upload was canceled'));
        return;
      }

      // Poll for completion - check fresh state each iteration
      const checkInterval = setInterval(() => {
        const state = getCurrentState();
        
        if (!state) {
          clearInterval(checkInterval);
          reject(new Error('Upload state lost'));
          return;
        }

        if (state.uploadStatus === 'UPLOADED' && state.fileKey) {
          clearInterval(checkInterval);
          resolve({
            fileKey: state.fileKey,
            file: state.file,
            localPreviewUrl: state.localPreviewUrl,
          });
        } else if (state.uploadStatus === 'FAILED') {
          clearInterval(checkInterval);
          reject(new Error(state.error || 'Upload failed'));
        } else if (state.uploadStatus === 'CANCELED') {
          clearInterval(checkInterval);
          reject(new Error('Upload was canceled'));
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Upload timeout'));
      }, 30000);
    });
  }, []);

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    const currentState = uploadStateRef.current;
    if (currentState?.localPreviewUrl) {
      URL.revokeObjectURL(currentState.localPreviewUrl);
    }
    setUploadState(null);
    abortControllerRef.current = null;
  }, []);

  return {
    uploadState,
    startUpload,
    cancelUpload,
    getUploadResult,
    waitForUpload,
    reset,
  };
}
