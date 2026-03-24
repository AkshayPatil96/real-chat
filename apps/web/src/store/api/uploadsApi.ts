import { api } from './api';

interface GeneratePresignedUrlRequest {
  fileName: string;
  fileType: string;
  uploadType: 'avatar' | 'attachment';
}

interface GeneratePresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  fileUrl: string;
}

/**
 * RTK Query API for file uploads
 * 
 * Architecture:
 * - Store only fileKey in your database/state, NOT fileUrl
 * - Use getPublicUrl to convert fileKey → CloudFront URL when needed
 * - uploadUrl (presigned) is for uploading, fileUrl (CloudFront) is for downloading
 * - All URLs are generated on-demand from fileKey for security and flexibility
 */
export const uploadsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Generate presigned URL for direct S3 upload
     * Returns: uploadUrl (for PUT to S3), fileKey (store this!), fileUrl (CloudFront, for immediate display)
     */
    generatePresignedUrl: builder.mutation<
      GeneratePresignedUrlResponse,
      GeneratePresignedUrlRequest
    >({
      query: (body) => ({
        url: '/uploads/presigned-url',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: GeneratePresignedUrlResponse }) => response.data,
    }),

    /**
     * Delete a file from S3
     */
    deleteFile: builder.mutation<void, string>({
      query: (fileKey) => ({
        url: `/uploads/${encodeURIComponent(fileKey)}`,
        method: 'DELETE',
      }),
    }),

    /**
     * Generate presigned download URL (for private/temporary access)
     */
    generateDownloadUrl: builder.query<{ downloadUrl: string }, string>({
      query: (fileKey) => ({
        url: `/uploads/download/${encodeURIComponent(fileKey)}`,
        method: 'GET',
      }),
      transformResponse: (response: { data: { downloadUrl: string } }) => response.data,
    }),

    /**
     * Get public URL for a file key (CloudFront URL)
     * Use this for displaying files in the UI
     */
    getPublicUrl: builder.query<{ fileUrl: string }, string>({
      query: (fileKey) => ({
        url: `/uploads/url/${encodeURIComponent(fileKey)}`,
        method: 'GET',
      }),
      transformResponse: (response: { data: { fileUrl: string } }) => response.data,
    }),
  }),
});

export const {
  useGeneratePresignedUrlMutation,
  useDeleteFileMutation,
  useGenerateDownloadUrlQuery,
  useLazyGenerateDownloadUrlQuery,
  useGetPublicUrlQuery,
  useLazyGetPublicUrlQuery,
} = uploadsApi;
