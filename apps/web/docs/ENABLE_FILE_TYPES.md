# 🚀 Quick Start: Enable New File Types

This guide shows how to enable video, PDF, and document uploads once backend support is ready.

## 📋 Steps to Enable New File Types

### 1. Update FileUploadDropdown

In `FileUploadDropdown.tsx`, change `disabled` to `false`:

```tsx
const uploadOptions: UploadOption[] = [
  {
    id: 'image',
    label: 'Photo',
    icon: <Image className="h-4 w-4" />,
    accept: 'image/*',
    disabled: false, // Already enabled
    description: 'JPG, PNG, WebP, GIF (Max 25MB)',
  },
  {
    id: 'video',
    label: 'Video',
    icon: <Video className="h-4 w-4" />,
    accept: 'video/*',
    disabled: false, // ⬅️ Change this
    description: 'MP4, WebM (Max 50MB)',
  },
  {
    id: 'pdf',
    label: 'PDF',
    icon: <FileText className="h-4 w-4" />,
    accept: '.pdf',
    disabled: false, // ⬅️ Change this
    description: 'PDF files (Max 25MB)',
  },
  // ... etc
];
```

### 2. Update File Validation

In `useFileUpload.ts`, adjust size limits if needed:

```typescript
const validateFile = (file: File, allowedTypes: FileUploadType[]): boolean => {
  const fileType = getUploadType(file);
  
  if (!allowedTypes.includes(fileType)) {
    setError(`File type not allowed`);
    return false;
  }

  // Custom size limits per type
  const SIZE_LIMITS = {
    image: 25 * 1024 * 1024,      // 25MB
    video: 50 * 1024 * 1024,      // 50MB ⬅️ Adjust as needed
    pdf: 25 * 1024 * 1024,        // 25MB
    document: 25 * 1024 * 1024,   // 25MB
    spreadsheet: 25 * 1024 * 1024 // 25MB
  };

  const maxSize = SIZE_LIMITS[fileType] || 25 * 1024 * 1024;

  if (file.size > maxSize) {
    setError(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    return false;
  }

  setError(null);
  return true;
};
```

### 3. Pass Allowed Types to MessageInput

Update where `MessageInput` is used to enable new types:

```tsx
// Before (only images)
<MessageInput
  onSendMessage={handleSendMessage}
  conversationId={conversationId}
/>

// After (enable video and PDF)
<MessageInput
  onSendMessage={handleSendMessage}
  conversationId={conversationId}
  allowedFileTypes={['image', 'video', 'pdf']} // ⬅️ Add this
/>
```

### 4. Update MessageInput Props (if needed)

In `MessageInput.tsx`:

```tsx
interface MessageInputProps {
  onSendMessage: (content: string, attachment?: UploadedFile) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: string;
  allowedFileTypes?: FileUploadType[]; // ⬅️ Add this
}

// Then pass to FileUploadDropdown
<FileUploadDropdown
  onFileSelect={handleFileSelect}
  disabled={disabled || uploading}
  allowedTypes={allowedFileTypes || ['image']} // ⬅️ Use prop
/>
```

### 5. Update FilePreview Icons

FilePreview already handles all file types! No changes needed.

## 🎨 Add Custom File Type Icons

To add icons for new file types in `FilePreview.tsx`:

```tsx
const getFileIcon = (type: FileUploadType) => {
  switch (type) {
    case 'image':
      return <Image className="h-6 w-6" />;
    case 'video':
      return <Video className="h-6 w-6" />;
    case 'pdf':
      return <FileText className="h-6 w-6" />;
    case 'document':
      return <FileIcon className="h-6 w-6" />;
    case 'spreadsheet':
      return <Sheet className="h-6 w-6" />; // ⬅️ Add from lucide-react
    default:
      return <FileIcon className="h-6 w-6" />;
  }
};
```

## 🖼️ Add Video Thumbnail Generation

For video previews:

```typescript
// In useFileUpload.ts, update uploadFile function
const uploadFile = async (file: File): Promise<UploadedFile> => {
  // ... existing code ...

  // Generate preview
  let preview = '';
  if (file.type.startsWith('image/')) {
    preview = URL.createObjectURL(file);
  } else if (file.type.startsWith('video/')) {
    preview = await generateVideoThumbnail(file); // ⬅️ Add this
  }

  // ... rest of code ...
};

// Add helper function
const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    video.addEventListener('loadeddata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = 1; // Seek to 1 second
    });

    video.addEventListener('seeked', () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL());
    });

    video.src = URL.createObjectURL(file);
  });
};
```

## ✅ Testing Checklist

When enabling a new file type:

- [ ] File picker allows correct extensions
- [ ] File size validation works
- [ ] Upload to S3 succeeds
- [ ] Preview displays correctly
- [ ] Icon is appropriate
- [ ] Send message with attachment works
- [ ] Error messages are clear
- [ ] Backend accepts the file type

## 🔧 Backend Requirements

Before enabling a file type, ensure:

1. **Upload Service** supports the MIME type
   ```typescript
   // In backend: upload.service.ts
   private readonly ALLOWED_ATTACHMENT_TYPES = [
     'image/jpeg',
     'image/png',
     'video/mp4',     // ⬅️ Add new types
     'video/webm',
     'application/pdf',
     // ... etc
   ];
   ```

2. **Message Model** has attachment field
   ```typescript
   attachment: {
     fileUrl: String,
     fileKey: String,
     fileName: String,
     fileSize: Number,
     fileType: String,
   }
   ```

3. **Socket Events** include attachment data
   ```typescript
   socket.emit('message:new', {
     ...message,
     attachment: message.attachment
   });
   ```

## 📱 Mobile Considerations

For mobile file uploads:

1. **Camera Integration**
   ```tsx
   // Add to file input
   <input
     type="file"
     accept="image/*"
     capture="environment" // ⬅️ Opens camera on mobile
   />
   ```

2. **Video Recording**
   ```tsx
   <input
     type="file"
     accept="video/*"
     capture="environment" // ⬅️ Opens video camera
   />
   ```

## 🎯 Quick Enable Summary

**To enable all file types immediately:**

```tsx
// FileUploadDropdown.tsx - Line 30-70
// Set all `disabled: false`

// MessageInput.tsx - when using component
<MessageInput
  allowedFileTypes={['image', 'video', 'pdf', 'document', 'spreadsheet']}
  // ... other props
/>
```

---

**Ready to test?** Just change those `disabled` flags! 🚀
