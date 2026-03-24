# S3 Lifecycle Configuration for Media Upload

## Overview
This document describes the S3 lifecycle rule required for automatic cleanup of temporary upload files.

## The Problem
When users select files for upload but cancel before sending:
- Files are uploaded to S3 `temp/` prefix
- Upload is aborted or user navigates away
- Files remain in S3, wasting storage

## The Solution
AWS S3 Lifecycle Rule automatically deletes abandoned temp files after 24 hours.

## Configuration

### Via AWS Console

1. Go to S3 Console → Select your bucket
2. Navigate to **Management** tab
3. Click **Create lifecycle rule**
4. Configure:
   - **Rule name**: `delete-temp-uploads`
   - **Choose rule scope**: Limit to prefix
   - **Prefix**: `temp/`
   - **Lifecycle rule actions**: ✓ Expire current versions
   - **Days after object creation**: `1`

### Via AWS CLI

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket YOUR_BUCKET_NAME \
  --lifecycle-configuration file://lifecycle.json
```

**lifecycle.json:**
```json
{
  "Rules": [
    {
      "Id": "delete-temp-uploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

### Via Terraform

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "delete-temp-uploads"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }
}
```

## How It Works

1. **File Selection**
   - User selects image → Upload starts immediately
   - File uploaded to `temp/attachment/{userId}/{timestamp}-{id}-{filename}`

2. **Message Send**
   - Backend moves file from `temp/...` → `attachment/...`
   - Original temp file is deleted
   - Message stores final fileKey

3. **Upload Cancel**
   - Frontend calls delete API (best effort)
   - If delete fails, S3 lifecycle handles it
   - File automatically deleted after 24 hours

## Why 24 Hours?

- **Grace period**: Handles edge cases (network issues, crashes)
- **Cost effective**: Minimizes storage costs
- **Simple**: No cron jobs or database scans needed

## Monitoring

Check temp folder size regularly:

```bash
aws s3 ls s3://YOUR_BUCKET_NAME/temp/ --recursive --summarize
```

Expected behavior:
- Files ≤ 24 hours old
- Low total count (<100 files normal)
- Sudden spikes indicate issues

## Security Notes

- Lifecycle rules run server-side (cannot be bypassed)
- No IAM permissions needed for cleanup
- Works even if backend is down
- Independent of application code

## Testing

Test the lifecycle rule:

```bash
# Upload test file
echo "test" > test.txt
aws s3 cp test.txt s3://YOUR_BUCKET_NAME/temp/test.txt

# Check after 25 hours
aws s3 ls s3://YOUR_BUCKET_NAME/temp/test.txt
# Should return: "An error occurred (404)"
```

## Production Checklist

- [ ] Lifecycle rule configured on S3 bucket
- [ ] Rule targets `temp/` prefix only
- [ ] Expiration set to 1 day
- [ ] Rule status is "Enabled"
- [ ] Tested with sample upload
- [ ] Monitoring alerts configured (optional)

## Related Files

- Backend: `apps/backend/src/modules/uploads/upload.service.ts`
- Frontend: `apps/web/src/hooks/useMediaUpload.ts`
- Architecture: See PRODUCTION_ROADMAP.md

---

**Last Updated**: February 1, 2026
