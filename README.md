# Storage Kit

A unified, framework-agnostic storage service for S3-compatible providers (MinIO, Backblaze B2, Cloudflare R2).

## Features

- **Unified API** - Same interface for all S3-compatible storage providers
- **TypeScript First** - Full type safety with comprehensive type definitions
- **Framework Agnostic** - Works with any Node.js framework (Express, Fastify, Hono, etc.)
- **OpenAPI Specification** - Complete API specification for HTTP endpoints
- **Standardized Errors** - Consistent error handling across all providers

## Installation

```bash
npm install @storage-kit/core @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# or
pnpm add @storage-kit/core @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# or
yarn add @storage-kit/core @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Quick Start

```typescript
import { createStorageService } from '@storage-kit/core';

// Create a storage service for MinIO
const storage = createStorageService('minio', {
  endpoint: 'http://localhost:9000',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
});

// Upload a file
const result = await storage
  .getBucket('my-bucket')
  .uploadFile(buffer, 'image.png', 'avatars/user123', {
    contentType: 'image/png',
  });

console.log(result.url); // https://localhost:9000/my-bucket/avatars/user123/image.png
console.log(result.key); // avatars/user123/image.png
```

## Providers

### MinIO

```typescript
import { MinioStorageService } from '@storage-kit/core';

const storage = new MinioStorageService({
  endpoint: 'http://localhost:9000',
  accessKeyId: 'minioadmin',
  secretAccessKey: 'minioadmin',
  region: 'us-east-1', // Optional, defaults to 'us-east-1'
  publicUrlBase: 'https://cdn.example.com', // Optional custom public URL
});
```

### Backblaze B2

```typescript
import { BackBlazeStorageService } from '@storage-kit/core';

const storage = new BackBlazeStorageService({
  endpoint: 'https://s3.us-west-001.backblazeb2.com',
  accessKeyId: 'your-key-id',
  secretAccessKey: 'your-application-key',
  region: 'us-west-001',
  publicUrlBase: 'https://f001.backblazeb2.com/file',
});
```

### Cloudflare R2

```typescript
import { CloudflareR2StorageService } from '@storage-kit/core';

const storage = new CloudflareR2StorageService({
  endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
  accessKeyId: 'your-access-key-id',
  secretAccessKey: 'your-secret-access-key',
  publicUrlBase: 'https://your-custom-domain.com',
});
```

## API Reference

### Upload File

```typescript
const result = await storage
  .getBucket('my-bucket')
  .uploadFile(file, 'filename.png', 'optional/folder', {
    contentType: 'image/png',
    upsert: true, // Overwrite if exists
  });

// Returns: { url: string, key: string }
```

### Delete File

```typescript
await storage.getBucket('my-bucket').deleteFile('folder/file.png');
```

### Bulk Delete

```typescript
const result = await storage.getBucket('my-bucket').deleteFiles([
  'file1.png',
  'folder/file2.png',
  'file3.png',
]);

// Returns: { deleted: number, failed: Array<{ key: string, reason: string }> }
```

### Get Presigned Upload URL

```typescript
const result = await storage.getBucket('my-bucket').getPresignedUploadUrl(
  'avatars/user123/profile.png',
  {
    contentType: 'image/png',
    expiresIn: 3600, // 1 hour
  }
);

// Returns: { signedUrl: string, publicUrl: string, expiresAt: Date }
```

### Get Presigned Download URL

```typescript
const result = await storage.getBucket('my-bucket').getPresignedDownloadUrl(
  'avatars/user123/profile.png',
  {
    expiresIn: 3600, // 1 hour
  }
);

// Returns: { signedUrl: string, expiresAt: Date }
```

### Health Check

```typescript
const health = await storage.healthCheck();

// Returns: { status: 'healthy' | 'unhealthy', provider?: string, error?: string }
```

## Error Handling

All errors are thrown as `StorageError` with consistent error codes:

```typescript
import { StorageError } from '@storage-kit/core';

try {
  await storage.getBucket('my-bucket').deleteFile('missing-file.png');
} catch (error) {
  if (error instanceof StorageError) {
    console.log(error.code);    // 'FILE_NOT_FOUND'
    console.log(error.message); // 'The requested file does not exist'
    console.log(error.details); // { key: 'missing-file.png', bucket: 'my-bucket' }

    // For HTTP responses:
    console.log(error.toJSON());
    // {
    //   error: {
    //     code: 'FILE_NOT_FOUND',
    //     message: 'The requested file does not exist',
    //     details: { key: 'missing-file.png', bucket: 'my-bucket' }
    //   }
    // }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BUCKET_NOT_FOUND` | 404 | The specified bucket does not exist |
| `FILE_NOT_FOUND` | 404 | The requested file does not exist |
| `MISSING_FILE` | 400 | No file provided in upload request |
| `MISSING_REQUIRED_PARAM` | 400 | A required parameter is missing |
| `INVALID_SIGNED_URL_TYPE` | 400 | Invalid signed URL type (not 'upload' or 'download') |
| `EMPTY_KEYS_ARRAY` | 400 | The keys array for bulk delete is empty |
| `KEYS_LIMIT_EXCEEDED` | 400 | The keys array exceeds 1000 items |
| `UPLOAD_FAILED` | 500 | File upload failed |
| `DELETE_FAILED` | 500 | File deletion failed |
| `SIGNED_URL_FAILED` | 500 | Failed to generate presigned URL |
| `PROVIDER_ERROR` | 500 | General provider error |

## Environment Variables

### MinIO

| Variable | Description | Default |
|----------|-------------|---------|
| `MINIO_ENDPOINT` | MinIO server endpoint | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` | Access key ID | `minioadmin` |
| `MINIO_SECRET_KEY` | Secret access key | `minioadmin` |

### Backblaze B2

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKBLAZE_ENDPOINT` | B2 S3-compatible endpoint | - |
| `BACKBLAZE_KEY_ID` | Application key ID | - |
| `BACKBLAZE_APPLICATION_KEY` | Application key | - |
| `BACKBLAZE_REGION` | B2 region (e.g., `us-west-001`) | - |
| `BACKBLAZE_PUBLIC_URL` | Public download URL base | - |

### Cloudflare R2

| Variable | Description | Default |
|----------|-------------|---------|
| `CLOUDFLARE_R2_ENDPOINT` | R2 S3-compatible endpoint | - |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 access key ID | - |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 secret access key | - |
| `CLOUDFLARE_R2_PUBLIC_URL` | Public URL base (custom domain) | - |

## OpenAPI Specification

The package includes a complete OpenAPI 3.0.3 specification for implementing HTTP endpoints:

```typescript
// Access the OpenAPI spec
import spec from '@storage-kit/core/openapi';

// Or load the YAML file directly
// Located at: node_modules/@storage-kit/core/openapi/storage-api.yaml
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/storage/{bucket}/files` | Upload a file |
| `DELETE` | `/storage/{bucket}/files/{filePath}` | Delete a single file |
| `DELETE` | `/storage/{bucket}/files` | Bulk delete files |
| `GET` | `/storage/{bucket}/signed-url` | Generate presigned URL |
| `GET` | `/storage/health` | Health check |

## License

MIT
