import { useState } from 'react';
import axios from 'axios';
import { useGeneratePresignedUrlMutation } from '@/store/api/uploadsApi';

export type FileUploadType = 'image' | 'video' | 'document' | 'pdf' | 'spreadsheet';

export interface UploadedFile {
  file: File;
  preview: string;
  type: FileUploadType;
  uploadUrl?: string;
  fileUrl?: string;
  fileKey?: string;
}

export function useFileUpload() {
  const [generatePresignedUrl] = useGeneratePresignedUrlMutation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get the upload type based on file MIME type
   */
  const getUploadType = (file: File): FileUploadType => {
    const mimeType = file.type;
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return 'spreadsheet';
    }
    return 'document';
  };

  /**
   * Upload file directly to S3 using presigned URL with axios
   */
  const uploadToS3 = async (file: File, uploadUrl: string): Promise<void> => {
    try {
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        // Optional: Add progress tracking
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        },
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new Error(err.response?.data?.message || 'Failed to upload file to S3');
      }
      throw new Error('Failed to upload file to S3');
    }
  };

  /**
   * Complete upload flow: Generate presigned URL (RTK Query) → Upload to S3 (axios)
   * Note: fileUrl from backend is CloudFront URL, not direct S3 URL
   */
  const uploadFile = async (file: File): Promise<UploadedFile> => {
    setUploading(true);
    setError(null);

    try {
      // 1. Generate presigned URL using RTK Query
      const presignedData = await generatePresignedUrl({
        fileName: file.name,
        fileType: file.type,
        uploadType: 'attachment', // Using 'attachment' for message files
      }).unwrap();

      const { uploadUrl, fileUrl, fileKey } = presignedData;

      // 2. Upload to S3 using presigned URL (direct S3 upload)
      await uploadToS3(file, uploadUrl);

      // 3. Create local preview URL for images (using Object URL for instant preview)
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : '';

      const uploadedFile: UploadedFile = {
        file,
        preview,
        type: getUploadType(file),
        uploadUrl,
        fileUrl, // CloudFront URL for accessing the uploaded file
        fileKey, // S3 object key - store this in DB, not the URL
      };

      return uploadedFile;
    } catch (err) {
      let errorMessage = 'Upload failed';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'data' in err) {
        // RTK Query error
        const rtkError = err as { data?: { error?: { message?: string } } };
        errorMessage = rtkError.data?.error?.message || 'Upload failed';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Validate file before upload
   */
  const validateFile = (file: File, allowedTypes: FileUploadType[]): boolean => {
    const fileType = getUploadType(file);
    
    if (!allowedTypes.includes(fileType)) {
      setError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      return false;
    }

    // Size limits based on type
    const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

    const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

    if (file.size > maxSize) {
      setError(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
      return false;
    }

    setError(null);
    return true;
  };

  return {
    uploadFile,
    validateFile,
    uploading,
    error,
    getUploadType,
  };
}
