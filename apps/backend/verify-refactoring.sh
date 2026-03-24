#!/bin/bash

# S3 Refactoring Verification Script
# Checks that the security refactoring was successful

echo "🔍 Verifying S3 Security Refactoring..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: No raw S3 URLs in service
echo "1️⃣  Checking for raw S3 URLs in UploadService..."
if grep -r "s3\..*\.amazonaws\.com" src/modules/uploads/upload.service.ts > /dev/null 2>&1; then
  echo -e "${RED}❌ FAIL: Raw S3 URLs found in upload.service.ts${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASS: No raw S3 URLs in upload.service.ts${NC}"
fi

# Check 2: FileAccessService exists
echo "2️⃣  Checking FileAccessService exists..."
if [ -f "src/modules/uploads/file-access.service.ts" ]; then
  echo -e "${GREEN}✅ PASS: FileAccessService exists${NC}"
else
  echo -e "${RED}❌ FAIL: FileAccessService not found${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check 3: fileUrl not in upload service return types
echo "3️⃣  Checking UploadService return types..."
if grep -E "Promise<.*fileUrl.*>" src/modules/uploads/upload.service.ts > /dev/null 2>&1; then
  echo -e "${RED}❌ FAIL: fileUrl found in UploadService return types${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ PASS: fileUrl removed from UploadService${NC}"
fi

# Check 4: CloudFront URL in env config
echo "4️⃣  Checking CloudFront configuration..."
if grep -q "cloudFrontUrl" src/config/env.ts; then
  echo -e "${GREEN}✅ PASS: CloudFront URL configured in env.ts${NC}"
else
  echo -e "${RED}❌ FAIL: CloudFront URL not in env.ts${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check 5: CloudFront URL environment variable
echo "5️⃣  Checking environment variable..."
if [ -z "$AWS_CLOUDFRONT_URL" ]; then
  echo -e "${YELLOW}⚠️  WARNING: AWS_CLOUDFRONT_URL not set in environment${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ PASS: AWS_CLOUDFRONT_URL is set${NC}"
  echo "   Value: $AWS_CLOUDFRONT_URL"
fi

# Check 6: FileAccessService uses CloudFront
echo "6️⃣  Checking FileAccessService uses CloudFront..."
if grep -q "cloudFrontUrl" src/modules/uploads/file-access.service.ts; then
  echo -e "${GREEN}✅ PASS: FileAccessService uses CloudFront${NC}"
else
  echo -e "${RED}❌ FAIL: FileAccessService doesn't use CloudFront${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check 7: Controller uses FileAccessService
echo "7️⃣  Checking Controller integration..."
if grep -q "fileAccessService" src/modules/uploads/upload.controller.ts; then
  echo -e "${GREEN}✅ PASS: Controller uses FileAccessService${NC}"
else
  echo -e "${RED}❌ FAIL: Controller doesn't use FileAccessService${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Check 8: Documentation exists
echo "8️⃣  Checking documentation..."
if [ -f "docs/S3_ARCHITECTURE.md" ]; then
  echo -e "${GREEN}✅ PASS: S3_ARCHITECTURE.md exists${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: S3_ARCHITECTURE.md not found${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 9: No deprecated method
echo "9️⃣  Checking for deprecated methods..."
if grep -q "generatePresignedDownloadUrl" src/modules/uploads/upload.service.ts; then
  echo -e "${YELLOW}⚠️  WARNING: Deprecated method still in UploadService${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ PASS: Deprecated methods removed${NC}"
fi

# Check 10: GetObjectCommand not imported in UploadService
echo "🔟 Checking import cleanup..."
if grep -q "GetObjectCommand" src/modules/uploads/upload.service.ts; then
  echo -e "${YELLOW}⚠️  WARNING: GetObjectCommand still imported in UploadService${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ PASS: Unused imports removed${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Summary
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
  echo "The S3 security refactoring is complete and correct."
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  ${WARNINGS} WARNING(S)${NC}"
  echo "Refactoring is complete but there are minor issues to address."
  exit 0
else
  echo -e "${RED}❌ ${ERRORS} ERROR(S), ${WARNINGS} WARNING(S)${NC}"
  echo "Please fix the errors above before proceeding."
  exit 1
fi
