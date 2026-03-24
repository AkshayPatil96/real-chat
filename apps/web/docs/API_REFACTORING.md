# 🔄 API Refactoring Summary

## What Changed?

Refactored the file upload system to use **RTK Query** and **axios** instead of raw `fetch` calls.

### Before (fetch)
```typescript
const response = await fetch(`${apiUrl}/uploads/presigned-url`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ fileName, fileType, uploadType }),
});
```

### After (RTK Query + axios)
```typescript
// Backend API: RTK Query
const presignedData = await generatePresignedUrl({
  fileName: file.name,
  fileType: file.type,
  uploadType: 'attachment',
}).unwrap();

// S3 Upload: axios
await axios.put(uploadUrl, file, {
  headers: { 'Content-Type': file.type },
  onUploadProgress: (progressEvent) => {
    // Track upload progress
  },
});
```

---

## ✅ Benefits

### 1. **RTK Query for Backend API**
- ✅ **Automatic caching** - No duplicate requests
- ✅ **Built-in loading states** - `isLoading`, `isError`, `isSuccess`
- ✅ **Automatic auth tokens** - Clerk JWT injected automatically
- ✅ **Type safety** - Full TypeScript support
- ✅ **Consistent error handling** - Normalized error responses
- ✅ **Integration with Redux** - Works with existing state management

### 2. **axios for S3 Upload**
- ✅ **Better error handling** - Automatic error transformation
- ✅ **Upload progress tracking** - `onUploadProgress` callback
- ✅ **Request cancellation** - Cancel in-flight requests
- ✅ **Automatic JSON parsing** - No manual `.json()` calls
- ✅ **Interceptors** - Easy to add global config
- ✅ **Better timeout control** - Configurable timeouts

### 3. **Why Not RTK Query for S3?**
- ❌ RTK Query is designed for **your backend API**, not third-party services
- ❌ S3 presigned URLs are temporary and shouldn't be cached
- ❌ No need for Redux state management for S3 uploads
- ✅ axios gives us lightweight, flexible HTTP client for external services

---

## 📁 Files Changed

### New Files
- `apps/web/src/store/api/uploadsApi.ts` - RTK Query endpoints

### Modified Files
- `apps/web/src/hooks/useFileUpload.ts` - Refactored to use RTK Query + axios
- `apps/web/src/store/api/index.ts` - Export new API
- `apps/web/package.json` - Added axios dependency

---

## 🔧 New RTK Query Endpoints

```typescript
// Generate presigned URL
const [generateUrl] = useGeneratePresignedUrlMutation();
const result = await generateUrl({
  fileName: 'photo.jpg',
  fileType: 'image/jpeg',
  uploadType: 'attachment'
}).unwrap();

// Delete file
const [deleteFile] = useDeleteFileMutation();
await deleteFile(fileKey).unwrap();

// Get download URL
const { data } = useGenerateDownloadUrlQuery(fileKey);
```

---

## 📊 Comparison: fetch vs RTK Query vs axios

| Feature | fetch | axios | RTK Query |
|---------|-------|-------|-----------|
| **Native Browser** | ✅ Yes | ❌ No (28KB) | ❌ No |
| **Auto JSON Parsing** | ❌ Manual | ✅ Yes | ✅ Yes |
| **Error Handling** | ⚠️ Basic | ✅ Great | ✅ Best |
| **Progress Tracking** | ⚠️ Complex | ✅ Easy | ❌ N/A |
| **Caching** | ❌ No | ❌ No | ✅ Yes |
| **Redux Integration** | ❌ No | ❌ No | ✅ Yes |
| **TypeScript** | ⚠️ Manual | ✅ Good | ✅ Excellent |
| **Best For** | Simple requests | External APIs | Backend APIs |

---

## 🎯 Usage in Your Code

No changes needed! The hook interface remains the same:

```typescript
const { uploadFile, uploading, error } = useFileUpload();

const handleFileSelect = async (file: File) => {
  try {
    const uploadedFile = await uploadFile(file);
    console.log('Uploaded:', uploadedFile.fileUrl);
  } catch (err) {
    console.error('Upload failed:', err);
  }
};
```

---

## 🚀 Future Enhancements

### 1. Upload Progress UI
```typescript
// In useFileUpload.ts
const [uploadProgress, setUploadProgress] = useState(0);

await axios.put(uploadUrl, file, {
  onUploadProgress: (progressEvent) => {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total!
    );
    setUploadProgress(percent); // ⬅️ Expose to UI
  },
});
```

### 2. Request Cancellation
```typescript
const cancelTokenSource = axios.CancelToken.source();

await axios.put(uploadUrl, file, {
  cancelToken: cancelTokenSource.token,
});

// Cancel upload
cancelTokenSource.cancel('Upload cancelled by user');
```

### 3. Retry Logic
```typescript
// RTK Query built-in
const [generateUrl] = useGeneratePresignedUrlMutation({
  fixedCacheKey: 'upload-url', // Prevent duplicates
});
```

---

## 📚 Why This Approach?

### Architecture Decision
- **Backend API calls** → RTK Query (caching, Redux integration)
- **Third-party APIs** (S3) → axios (flexibility, progress tracking)
- **Simple fetches** → fetch (if no special requirements)

### Best Practice
This follows the **separation of concerns** principle:
- RTK Query manages **application state** and **backend communication**
- axios handles **file transfers** and **external services**
- Each tool does what it's best at!

---

## ✅ Testing

All functionality remains the same. Test:
1. Select image → Uploads to S3
2. Preview appears → Works
3. Error handling → Shows toast
4. Send message → Includes attachment

**No breaking changes!** 🎉
