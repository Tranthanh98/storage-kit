# Change: Define Storage Kit HTTP API Specification

## Why

The Storage Kit needs a stable, framework-agnostic HTTP API specification that can be packaged as an npm module and reused across different projects and frameworks. Currently, the storage service implementations exist but lack a formal API contract. An OpenAPI 3.x specification will enable:

- Consistent API behavior across all storage providers (MinIO, Backblaze B2, Cloudflare R2)
- Auto-generation of client SDKs and documentation
- Clear contract for request/response formats and error handling
- Long-term API stability as the kit evolves

## What Changes

### New Capabilities

- **File Upload API**: `POST /storage/{bucket}/files` - Upload files via multipart/form-data
- **File Deletion API**: `DELETE /storage/{bucket}/files/{filePath}` - Delete single file
- **Bulk Delete API**: `DELETE /storage/{bucket}/files` - Delete multiple files by keys
- **Signed URL API**: `GET /storage/{bucket}/signed-url` - Generate presigned URLs for upload (PUT) or download (GET)
- **Health Check API** (optional): `GET /storage/health` - Verify provider connectivity

### API Design Principles

- All responses are JSON
- Consistent error format across all endpoints
- Bucket is a path parameter for flexibility
- File paths support folder structures via URL encoding
- No authentication in spec (handled by consuming application)

### Breaking Changes

None - this is a new specification for existing functionality.

## Impact

- **Affected specs**: None (new capability)
- **Affected code**:
  - `providers/storageService.ts` - Interface may need alignment
  - `providers/minioStorageService.ts` - Implementation review
  - `providers/backblazeStorageService.ts` - Implementation review
  - `providers/cloudflareR2StorageService.ts` - Implementation review
- **New files**:
  - `openapi/storage-api.yaml` - OpenAPI 3.x specification
  - HTTP route handlers (framework-agnostic design)
