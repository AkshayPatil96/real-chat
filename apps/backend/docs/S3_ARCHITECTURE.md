# 🔒 S3 File Upload Architecture - Security Refactoring

## ⚠️ CRITICAL SECURITY ISSUE (FIXED)

### Before (INSECURE ❌):
```typescript
// ❌ Raw S3 URLs were constructed and returned
const fileUrl = `https://bucket.s3.region.amazonaws.com/${fileKey}`;
return { uploadUrl, fileKey, fileUrl }; // ❌ fileUrl stored in DB

// ❌ Database contained URLs
{
  avatar: "https://bucket.s3.amazonaws.com/avatar/user123/file.jpg"
}
```

**Problems:**
1. ✗ Direct S3 URLs exposed (bypasses CloudFront)
2. ✗ URLs stored in database (can't change distribution method)
3. ✗ Upload URL = Download URL (confusion)
4. ✗ No separation of concerns
5. ✗ Can't add signed URLs later

### After (SECURE ✅):
```typescript
// ✅ Only file keys are stored
return { uploadUrl, fileKey }; // No fileUrl in service

// ✅ Database contains only keys
{
  avatar: "avatar/user123/1234567890-abc123-file.jpg"
}

// ✅ URLs generated at read-time
const publicUrl = fileAccessService.getPublicUrl(fileKey);
// Returns: "https://cloudfront-domain.net/avatar/user123/file.jpg"
```

**Benefits:**
1. ✓ S3 bucket remains private
2. ✓ CloudFront for public distribution
3. ✓ Keys stored, URLs generated on-demand
4. ✓ Clear separation: UploadService (write) vs FileAccessService (read)
5. ✓ Easy to add signed URLs later
6. ✓ Can switch CDN without DB migration

---

## 📐 Architecture

### Service Responsibilities

#### UploadService (Write Operations)
- Generate presigned PUT URLs for client uploads
- Upload files server-side when needed
- Delete files from S3
- **RETURNS:** `fileKey` only (no URLs)

#### FileAccessService (Read Operations)
- Convert file keys → CloudFront URLs
- Generate presigned GET URLs (temporary access)
- Generate download URLs (with Content-Disposition)
- **KNOWS ABOUT:** CloudFront, S3 URL structure

#### Controller Layer (Orchestration)
- Combines both services
- Maintains backward compatibility
- Returns both `fileKey` and `fileUrl` in responses
- **RULE:** `fileKey` goes to DB, `fileUrl` is for immediate display

---

## 🔄 Upload Flow

### 1. Generate Presigned URL
```
Client → POST /api/v1/uploads/presigned-url
        {
          fileName: "photo.jpg",
          fileType: "image/jpeg",
          uploadType: "attachment"
        }

Backend → UploadService.generatePresignedUploadUrl()
       → Returns: { uploadUrl, fileKey }

Backend → FileAccessService.getPublicUrl(fileKey)
       → Returns: CloudFront URL

Response → {
  uploadUrl: "https://bucket.s3.amazonaws.com/...?signature=...",  // Upload here
  fileKey: "attachment/user123/1234567890-abc-photo.jpg",          // Store in DB
  fileUrl: "https://cloudfront-domain.net/attachment/user123/..."  // Display immediately
}
```

### 2. Client Upload
```
Client → PUT uploadUrl (directly to S3)
      → File uploaded

Client → Stores fileKey in database
      → { messageId: "123", attachment: { fileKey: "attachment/..." } }
```

### 3. Display File
```
Frontend → Reads fileKey from database
        → Constructs URL: `${CLOUDFRONT_BASE}/${fileKey}`
        → OR calls: GET /api/v1/uploads/url/:fileKey
        → Displays image/file
```

---

## 🔑 Key Concepts

### Upload URL ≠ Download URL

| Type | Purpose | Method | Expiration | Caching |
|------|---------|--------|------------|---------|
| **Upload URL** | Write file to S3 | Presigned PUT | 5 minutes | No |
| **Download URL (presigned)** | Temporary access | Presigned GET | 1 hour | No |
| **Public URL (CloudFront)** | Public distribution | CloudFront | Permanent | Yes |

### Why Store Keys, Not URLs?

```typescript
// ❌ BAD: Store URLs
{
  avatar: "https://old-cdn.com/file.jpg"  // Can't migrate to new CDN
}

// ✅ GOOD: Store keys
{
  avatar: "avatar/user123/file.jpg"  // Can switch CDN anytime
}

// Convert at read-time
const url = fileAccessService.getPublicUrl(user.avatar);
// Now returns: "https://new-cdn.com/avatar/user123/file.jpg"
```

---

## 🛡️ Security Model

### S3 Bucket (Private)
- No public access
- Only accepts requests with valid presigned URLs
- CloudFront has Origin Access Identity (OAI)

### CloudFront (Public)
- Sits in front of S3
- Caches files globally
- Public access allowed
- Optional: Signed URLs for time-limited access (future)

### Flow
```
User → CloudFront → (OAI) → S3 (private bucket)
     ✓ Allowed      ✓ Auth      ✓ Serves file

User → S3 (direct)
     ✗ Blocked (bucket is private)
```

---

## 📝 Usage Examples

### Upload a File
```typescript
// 1. Get presigned URL
const response = await fetch('/api/v1/uploads/presigned-url', {
  method: 'POST',
  body: JSON.stringify({
    fileName: 'photo.jpg',
    fileType: 'image/jpeg',
    uploadType: 'attachment'
  })
});

const { uploadUrl, fileKey, fileUrl } = await response.json();

// 2. Upload to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBuffer,
  headers: { 'Content-Type': 'image/jpeg' }
});

// 3. Save to database (fileKey only!)
await db.messages.create({
  content: 'Check this out!',
  attachment: {
    fileKey: fileKey,        // ✅ Store this
    fileName: 'photo.jpg',
    fileSize: 123456,
    fileType: 'image/jpeg'
  }
});

// 4. Display (use fileUrl or construct from fileKey)
<img src={fileUrl} />
```

### Display a File
```typescript
// Option 1: Construct URL (recommended)
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL;
const publicUrl = `${CLOUDFRONT_URL}/${message.attachment.fileKey}`;

// Option 2: Call API
const response = await fetch(`/api/v1/uploads/url/${encodeURIComponent(fileKey)}`);
const { publicUrl } = await response.json();

// Option 3: Presigned URL (for private files)
const response = await fetch(`/api/v1/uploads/download/${encodeURIComponent(fileKey)}`);
const { downloadUrl } = await response.json();
```

### Server-Side Usage
```typescript
import { fileAccessService } from './modules/uploads/index.js';

// Convert keys to URLs
const user = await User.findById(userId);
const avatarUrl = fileAccessService.getPublicUrl(user.avatarKey);

// Batch conversion
const messageKeys = messages.map(m => m.attachment?.fileKey).filter(Boolean);
const urls = fileAccessService.getPublicUrls(messageKeys);
```

---

## 🔍 Validation Checklist

- [x] S3 bucket is private (no public access policies)
- [x] UploadService returns only `fileKey` (no `fileUrl`)
- [x] Database stores only keys (no URLs)
- [x] FileAccessService uses CloudFront URL
- [x] Controllers maintain backward compatibility
- [x] Upload URLs expire (5 minutes)
- [x] Download URLs are time-limited (1 hour)
- [x] No raw S3 URLs in responses
- [x] Clear separation: write (UploadService) vs read (FileAccessService)
- [x] Environment variable: `AWS_CLOUDFRONT_URL` configured

---

## 🚀 Migration Path (If Needed)

If existing database has URLs instead of keys:

```typescript
// Migration script
async function migrateUrlsToKeys() {
  const messages = await Message.find({ 'attachment.fileUrl': { $exists: true } });
  
  for (const message of messages) {
    const url = message.attachment.fileUrl;
    
    // Extract key from URL
    // "https://bucket.s3.amazonaws.com/attachment/user/file.jpg"
    // → "attachment/user/file.jpg"
    const key = url.split('.amazonaws.com/')[1] || 
                url.split('.cloudfront.net/')[1];
    
    message.attachment.fileKey = key;
    delete message.attachment.fileUrl;
    
    await message.save();
  }
}
```

---

## 🎯 Future Enhancements

### CloudFront Signed URLs
```typescript
// For time-limited access to public files
const signedUrl = fileAccessService.getSignedCloudFrontUrl(fileKey, {
  expiresIn: 3600,
  ipAddress: req.ip
});
```

### Image Transformations
```typescript
// On-the-fly resizing via CloudFront Lambda@Edge
const thumbnailUrl = fileAccessService.getPublicUrl(fileKey, {
  width: 200,
  height: 200,
  quality: 80
});
```

---

## ✅ Verification Commands

```bash
# Check TypeScript compilation
pnpm build

# Verify CloudFront URL is set
echo $AWS_CLOUDFRONT_URL

# Test upload flow
curl -X POST http://localhost:8001/api/v1/uploads/presigned-url \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","fileType":"image/jpeg","uploadType":"attachment"}'

# Should return: { uploadUrl, fileKey, fileUrl }
# fileUrl should start with CloudFront URL, not s3.amazonaws.com
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `upload.service.ts` | S3 write operations (upload, delete) |
| `file-access.service.ts` | URL generation (CloudFront, presigned) |
| `upload.controller.ts` | HTTP handlers (combines both services) |
| `upload.routes.ts` | API routes |
| `config/env.ts` | Environment configuration |

---

**Summary:** File keys are the source of truth. URLs are ephemeral and generated on-demand.
