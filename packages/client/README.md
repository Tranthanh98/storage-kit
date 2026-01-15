# @storage-kit/client

Framework-agnostic TypeScript client SDK for Storage Kit. Easily upload files, delete files, and generate signed URLs from any JavaScript/TypeScript application.

## Installation

```bash
npm install @storage-kit/client
# or
pnpm add @storage-kit/client
# or
yarn add @storage-kit/client
```

## Quick Start

```typescript
import { createStorageClient } from "@storage-kit/client";

// Create a client instance
const storage = createStorageClient({
  baseURL: "http://localhost:3000/storage",
  headers: {
    Authorization: `Bearer ${token}`, // Optional: add auth headers
  },
});

// Upload a file
const { data, error } = await storage.upload({
  bucket: "avatars",
  file: file, // File from input, Blob, or { buffer, name, type }
  path: "users/123",
});

if (error) {
  console.error(error.code, error.message);
} else {
  console.log("Uploaded:", data.url);
}
```

## API Reference

### `createStorageClient(config)`

Creates a Storage Kit client instance.

```typescript
const storage = createStorageClient({
  // Required: Base URL of your Storage Kit server
  baseURL: "http://localhost:3000/storage",

  // Optional: Default bucket (used when bucket="_")
  defaultBucket: "uploads",

  // Optional: Custom fetch implementation (for React Native, Node.js, or mocking)
  fetch: customFetch,

  // Optional: Default headers for all requests
  headers: {
    Authorization: "Bearer token",
  },

  // Optional: Request timeout in milliseconds (default: 30000)
  timeout: 60000,
});
```

### `storage.upload(params, options?)`

Upload a file to storage.

```typescript
const { data, error } = await storage.upload({
  bucket: "avatars", // Bucket name (use "_" for default)
  file: file, // File, Blob, or { buffer, name, type }
  path: "users/123", // Optional: folder path
  contentType: "image/png", // Optional: MIME type override
});

// Success response
data = {
  url: "https://cdn.example.com/avatars/users/123/avatar.png",
  key: "users/123/avatar.png",
};
```

**File input types:**

```typescript
// Browser: File from input element
const file = inputElement.files[0];

// Browser: Blob from canvas
const blob = await canvas.toBlob();

// React Native / Node.js: Buffer with metadata
const file = {
  buffer: imageBuffer,
  name: "photo.jpg",
  type: "image/jpeg",
};
```

### `storage.delete(params, options?)`

Delete a single file.

```typescript
const { error } = await storage.delete({
  bucket: "avatars",
  key: "users/123/avatar.png",
});
```

### `storage.bulkDelete(params, options?)`

Delete multiple files (max 1000 keys).

```typescript
const { data, error } = await storage.bulkDelete({
  bucket: "uploads",
  keys: ["file1.jpg", "file2.jpg", "file3.pdf"],
});

// Response
data = {
  deleted: 2,
  failed: [{ key: "file3.pdf", reason: "FILE_NOT_FOUND" }],
};
```

### `storage.getSignedUrl(params, options?)`

Generate a presigned URL for direct upload or download.

```typescript
// Upload URL (PUT)
const { data } = await storage.getSignedUrl({
  bucket: "uploads",
  key: "large-video.mp4",
  type: "upload",
  contentType: "video/mp4",
  expiresIn: 7200, // 2 hours
});

// Use the signed URL for direct upload
await fetch(data.signedUrl, {
  method: "PUT",
  body: videoFile,
  headers: { "Content-Type": "video/mp4" },
});

// Download URL (GET)
const { data } = await storage.getSignedUrl({
  bucket: "uploads",
  key: "document.pdf",
  type: "download",
});

// data.signedUrl can be used directly for downloads
```

### `storage.health(options?)`

Check storage provider connectivity.

```typescript
const { data, error } = await storage.health();

// Response
data = {
  status: "healthy", // or "unhealthy"
  provider: "minio",
};
```

## Error Handling

All methods return a `{ data, error }` tuple instead of throwing:

```typescript
const { data, error } = await storage.upload({ bucket: "uploads", file });

if (error) {
  // error is a StorageClientError with:
  console.error(error.code); // Error code (e.g., "BUCKET_NOT_FOUND")
  console.error(error.message); // Human-readable message
  console.error(error.status); // HTTP status code (if applicable)
  console.error(error.details); // Additional error details

  // Handle specific error codes
  switch (error.code) {
    case "BUCKET_NOT_FOUND":
      // Handle missing bucket
      break;
    case "NETWORK_ERROR":
      // Handle network issues
      break;
    case "REQUEST_TIMEOUT":
      // Handle timeout
      break;
  }
}
```

### Error Codes

| Code                      | Description                      |
| ------------------------- | -------------------------------- |
| `BUCKET_NOT_FOUND`        | Bucket does not exist            |
| `FILE_NOT_FOUND`          | File does not exist              |
| `MISSING_FILE`            | No file provided for upload      |
| `MISSING_REQUIRED_PARAM`  | Required parameter missing       |
| `INVALID_SIGNED_URL_TYPE` | Invalid type for signed URL      |
| `EMPTY_KEYS_ARRAY`        | Empty keys array for bulk delete |
| `KEYS_LIMIT_EXCEEDED`     | Too many keys (max 1000)         |
| `UPLOAD_FAILED`           | Upload operation failed          |
| `DELETE_FAILED`           | Delete operation failed          |
| `SIGNED_URL_FAILED`       | Signed URL generation failed     |
| `PROVIDER_ERROR`          | Storage provider error           |
| `NETWORK_ERROR`           | Network request failed           |
| `REQUEST_TIMEOUT`         | Request timed out                |
| `INVALID_RESPONSE`        | Invalid response from server     |
| `UNKNOWN_ERROR`           | Unknown error occurred           |

## TypeScript

All types are exported for TypeScript users:

```typescript
import type {
  StorageClient,
  StorageClientConfig,
  UploadParams,
  UploadResponse,
  DeleteParams,
  BulkDeleteParams,
  BulkDeleteResponse,
  SignedUrlParams,
  SignedUrlResponse,
  HealthResponse,
  Result,
  FileInput,
  FetchOptions,
} from "@storage-kit/client";

import { StorageClientError, type StorageClientErrorCode } from "@storage-kit/client";
```

## React Native

The client works with React Native. Provide a compatible fetch if needed:

```typescript
import { createStorageClient } from "@storage-kit/client";

const storage = createStorageClient({
  baseURL: "https://api.example.com/storage",
  // React Native's fetch works by default
});

// Upload using buffer (React Native doesn't have File API)
const { data, error } = await storage.upload({
  bucket: "photos",
  file: {
    buffer: imageBuffer,
    name: "photo.jpg",
    type: "image/jpeg",
  },
});
```

## License

MIT
