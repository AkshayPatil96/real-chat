# Quick Setup Guide - New Features

## 🚀 Jest Testing (ESM Support)

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Note on ESM Mocking
Tests are currently written using `jest.mock()` at the top level. For proper ESM support, update imports in test files:

```typescript
// Add this import to test files
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Keep existing jest.mock() calls - they work with @jest/globals
jest.mock('../user.repository.js');
```

---

## ☁️ AWS S3 File Upload Setup

### 1. Create an S3 Bucket
```bash
# Using AWS CLI
aws s3 mb s3://your-bucket-name

# Enable public read access (optional, for public files)
aws s3api put-bucket-policy --bucket your-bucket-name --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::your-bucket-name/*"
  }]
}'
```

### 2. Create IAM User with S3 Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### 3. Add Environment Variables
```env
# Add to .env file
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET=your-bucket-name
```

### 4. Test File Upload

#### Option A: Presigned URL (Recommended)
```typescript
// Frontend code
const response = await fetch('/api/v1/uploads/presigned-url', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fileName: 'avatar.jpg',
    fileType: 'image/jpeg',
    uploadType: 'avatar' // or 'attachment'
  })
});

const { uploadUrl, fileUrl } = await response.json();

// Upload directly to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': 'image/jpeg'
  }
});

// Use fileUrl in your app
console.log('File uploaded:', fileUrl);
```

#### Option B: Direct Server Upload
```typescript
// Frontend code with form data
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('uploadType', 'avatar');

const response = await fetch('/api/v1/uploads/direct', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  },
  body: formData
});

const { fileUrl } = await response.json();
```

### 5. File Size Limits
- **Avatars**: 5MB max (image/jpeg, image/png, image/webp)
- **Attachments**: 25MB max (images, PDFs, docs, spreadsheets, text files)

### 6. Delete File
```typescript
const fileKey = 'avatar/user123/1234567890-abc123-profile.jpg';
const encodedKey = encodeURIComponent(fileKey);

await fetch(`/api/v1/uploads/${encodedKey}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});
```

---

## 🔄 GitHub Actions CI/CD Setup

### 1. Required GitHub Secrets

Go to: Repository Settings → Secrets and variables → Actions

#### Required for Testing:
```
CLERK_SECRET_KEY
```
Value: Your Clerk secret key (or use `test_secret_key` for CI)

#### Optional for Docker:
```
DOCKER_USERNAME
DOCKER_PASSWORD
```
Docker Hub credentials for image publishing

#### Optional for Security Scanning:
```
SNYK_TOKEN
```
Snyk API token for advanced security scanning

### 2. Workflow Triggers

The CI/CD pipeline runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Only when backend files change

### 3. Pipeline Jobs

1. **Lint & Type Check** - Validates code quality
2. **Test** - Runs unit tests with MongoDB + Redis
3. **Build** - Compiles TypeScript and uploads artifacts
4. **Security** - Runs npm audit and Snyk scan
5. **Docker** - Builds and pushes Docker image (main branch only)

### 4. Viewing Results

- **Actions Tab**: See all workflow runs
- **Pull Requests**: See status checks
- **Artifacts**: Download build artifacts (retained for 7 days)

### 5. Customizing Workflow

Edit `.github/workflows/backend-ci.yml`:

```yaml
# Change Node version
node-version: '20'  # or '18', '22'

# Change test timeout
testTimeout: 30000  # milliseconds

# Add more jobs
deploy:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: [build]
  if: github.ref == 'refs/heads/main'
  steps:
    # Add your deployment steps
```

---

## 🐳 Docker Deployment

### Local Development
```bash
# 1. Set up environment
cp .env.docker.example .env.docker
nano .env.docker  # Edit with your values

# 2. Start all services
docker-compose up -d

# 3. View logs
docker-compose logs -f backend

# 4. Stop services
docker-compose down

# 5. Rebuild after code changes
docker-compose up -d --build
```

### Production Deployment
```bash
# 1. Build production image
docker build -t your-repo/real-chat-backend:latest -f apps/backend/Dockerfile .

# 2. Push to registry
docker push your-repo/real-chat-backend:latest

# 3. Deploy on server
docker run -d \
  --name real-chat-backend \
  -p 3001:3001 \
  --env-file .env.production \
  your-repo/real-chat-backend:latest
```

---

## 📊 Health Checks

### Verify Services

```bash
# Backend health
curl http://localhost:3001/health

# API documentation
open http://localhost:3001/api-docs

# Metrics (Prometheus)
curl http://localhost:3001/metrics

# Test file upload
curl -X POST http://localhost:3001/api/v1/uploads/presigned-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","fileType":"image/jpeg","uploadType":"avatar"}'
```

---

## 🔍 Troubleshooting

### Jest Tests Failing
```bash
# Clear Jest cache
pnpm --filter backend test --clearCache

# Check Node version (requires 18+)
node --version

# Verify test files exist
ls apps/backend/src/**/__tests__/*.test.ts
```

### AWS S3 Upload Errors
```bash
# Verify AWS credentials
aws s3 ls s3://your-bucket-name

# Check environment variables
echo $AWS_REGION
echo $AWS_S3_BUCKET

# Test IAM permissions
aws s3api head-bucket --bucket your-bucket-name
```

### Docker Build Issues
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check logs
docker-compose logs backend
```

### GitHub Actions Failing
1. Check Actions tab for error details
2. Verify secrets are set correctly
3. Ensure pnpm version matches (8.x)
4. Check if MongoDB/Redis services started

---

## 📚 Additional Resources

- **AWS S3 Documentation**: https://docs.aws.amazon.com/s3/
- **Jest Documentation**: https://jestjs.io/docs/ecmascript-modules
- **GitHub Actions**: https://docs.github.com/en/actions
- **Docker Best Practices**: https://docs.docker.com/develop/dev-best-practices/

---

## ✅ Verification Checklist

- [ ] Tests run successfully (`pnpm test`)
- [ ] TypeScript compiles without errors (`pnpm build`)
- [ ] AWS S3 credentials configured
- [ ] Docker containers start successfully
- [ ] GitHub Actions secrets configured
- [ ] API documentation accessible
- [ ] Health endpoint returns 200
- [ ] File upload working (test with presigned URL)

**All checks passed?** You're ready for production! 🚀
