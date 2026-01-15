# @storage-kit/fastify

Fastify plugin for Storage Kit - plug-and-play storage HTTP endpoints.

## Installation

```bash
npm install @storage-kit/fastify @storage-kit/core fastify
# or
pnpm add @storage-kit/fastify @storage-kit/core fastify
```

## Quick Start

### Recommended: Centralized Initialization

Create a single `createStorageKit` instance and use it throughout your app:

```typescript
// store-kit.ts
import { createStorageKit } from "@storage-kit/fastify";

export const storeKit = createStorageKit({
  provider: "minio",
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  defaultBucket: "uploads",
});
```

```typescript
// app.ts
import Fastify from "fastify";
import { storeKit } from "./store-kit";

const fastify = Fastify();

// Use as route handler (register as plugin with prefix)
fastify.register(storeKit.plugin(), { prefix: "/api/storage" });

// Use as service (direct method calls)
fastify.get("/example/presigned-url", async (request, reply) => {
  const result = await storeKit.getPresignedUploadUrl("_", "uploads/file.png", {
    contentType: "image/png",
    expiresIn: 3600,
  });
  return result;
});

fastify.listen({ port: 3000 }, () => {
  console.log("Server running on http://localhost:3000");
  console.log("API Reference: http://localhost:3000/api/storage/reference");
});
```

**Swagger UI** is automatically available at `/api/storage/reference` - no additional setup required!

## Service Methods

The `createStorageKit` instance provides direct access to storage operations:

```typescript
import { storeKit } from "./store-kit";

// Upload file programmatically
const result = await storeKit.uploadFile(
  "_",
  buffer,
  "avatar.png",
  "users/123"
);

// Generate presigned URL
const url = await storeKit.getPresignedUploadUrl("_", "files/doc.pdf", {
  contentType: "application/pdf",
  expiresIn: 3600,
});

// Generate presigned download URL
const downloadUrl = await storeKit.getPresignedDownloadUrl(
  "_",
  "files/doc.pdf"
);

// Delete file
await storeKit.deleteFile("_", "users/123/avatar.png");

// Bulk delete
await storeKit.deleteFiles("_", ["file1.png", "file2.png"]);

// Health check
const health = await storeKit.healthCheck();

// Get bucket-scoped service
const avatarStorage = storeKit.bucket("avatars");
await avatarStorage.uploadFile(buffer, "user123.png");

// Access underlying storage service for advanced operations
const storageService = storeKit.storage;
```

> **Note:** Use `"_"` as bucket parameter to use the `defaultBucket` configured during initialization.

## Endpoints

The plugin implements all endpoints defined in the OpenAPI specification:

| Method   | Path                       | Description          |
| -------- | -------------------------- | -------------------- |
| `POST`   | `/:bucket/files`           | Upload a file        |
| `DELETE` | `/:bucket/files/:filePath` | Delete a single file |
| `DELETE` | `/:bucket/files`           | Bulk delete files    |
| `GET`    | `/:bucket/signed-url`      | Generate signed URL  |
| `GET`    | `/health`                  | Health check         |

## Built-in Swagger UI

The plugin includes a built-in interactive API reference powered by Swagger UI. By default, it's available at the `/reference` path relative to your prefix.

### Default Behavior

```typescript
fastify.register(storeKit.plugin(), { prefix: "/api/storage" });
// Swagger UI available at: /api/storage/reference
```

### Customizing Swagger UI

```typescript
export const storeKit = createStorageKit({
  provider: "minio",
  // ... credentials
  swagger: {
    enabled: true,
    path: "/docs", // Custom path (default: "/reference")
    title: "My Storage API", // Custom page title
  },
});
// Swagger UI available at: /api/storage/docs
```

### Disabling Swagger UI

```typescript
export const storeKit = createStorageKit({
  provider: "minio",
  // ... credentials
  swagger: false, // Disable Swagger UI entirely
});
```

## Configuration

```typescript
interface FastifyStorageKitConfig {
  // Required
  provider: "minio" | "backblaze" | "cloudflare-r2";

  // Provider credentials
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  publicUrlBase?: string;

  // Adapter options
  defaultBucket?: string; // Default bucket when using "_" placeholder
  maxFileSize?: number; // Max file size in bytes (default: 10MB)
  allowedMimeTypes?: string[];

  // Swagger UI options
  swagger?:
    | boolean
    | {
        enabled?: boolean; // Enable/disable (default: true)
        path?: string; // URL path (default: "/reference")
        title?: string; // Page title
      };

  // Hooks
  onUploadComplete?: (result) => void;
  onError?: (error) => void;

  // Custom storage instance
  storage?: IStorageService;
}
```

## Usage Examples

### File Upload

```bash
curl -X POST http://localhost:3000/api/storage/my-bucket/files \
  -F "file=@/path/to/image.png" \
  -F "path=avatars/user123"
```

### Delete File

```bash
curl -X DELETE http://localhost:3000/api/storage/my-bucket/files/avatars%2Fuser123%2Fimage.png
```

### Generate Signed URL

```bash
curl "http://localhost:3000/api/storage/my-bucket/signed-url?key=file.png&type=upload"
```

## Features

- Uses `@fastify/multipart` for efficient file streaming
- Built-in schema validation
- Automatic error handling with proper HTTP status codes

## Legacy API (Deprecated)

The `storageKitPlugin()` function is deprecated. Please use `createStorageKit()` instead:

```typescript
// ❌ Deprecated
import { storageKitPlugin } from "@storage-kit/fastify";
fastify.register(storageKitPlugin, { prefix: "/api/storage", ... });

// ✅ Recommended
import { createStorageKit } from "@storage-kit/fastify";
const storeKit = createStorageKit({ ... });
fastify.register(storeKit.plugin(), { prefix: "/api/storage" });
```

## License

MIT
