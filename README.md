# Storage Kit

A unified, framework-agnostic storage service for S3-compatible providers (MinIO, Backblaze B2, Cloudflare R2).

## Features

- **Unified API** - Same interface for all S3-compatible storage providers
- **Framework Adapters** - Plug-and-play support for Express, Fastify, Hono, and NestJS
- **Built-in Swagger UI** - Interactive API documentation at `/reference`
- **TypeScript First** - Full type safety with comprehensive type definitions
- **OpenAPI Specification** - Complete API specification for HTTP endpoints
- **Standardized Errors** - Consistent error handling across all providers

## Packages

| Package                | Description                        |
| ---------------------- | ---------------------------------- |
| `@storage-kit/core`    | Core storage service and utilities |
| `@storage-kit/express` | Express.js adapter                 |
| `@storage-kit/fastify` | Fastify adapter                    |
| `@storage-kit/hono`    | Hono adapter (edge-compatible)     |
| `@storage-kit/nestjs`  | NestJS module                      |

## Quick Start

### Option 1: Framework Adapter (Recommended)

The fastest way to get started is using a framework adapter. Choose your framework:

- [Express](#express-integration)
- [Fastify](#fastify-integration)
- [Hono](#hono-integration)
- [NestJS](#nestjs-integration)

### Option 2: Core Library Only

For custom implementations or non-HTTP use cases:

```bash
npm install @storage-kit/core
```

```typescript
import { createStorageService } from "@storage-kit/core";

const storage = createStorageService("minio", {
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
});

// Upload a file
const result = await storage
  .getBucket("my-bucket")
  .uploadFile(buffer, "image.png", "avatars/user123", {
    contentType: "image/png",
  });

console.log(result.url); // https://localhost:9000/my-bucket/avatars/user123/image.png
```

---

## Express Integration

### Installation

```bash
npm install @storage-kit/express express
# or
pnpm add @storage-kit/express express
```

### Unified API (Recommended) ✨

The recommended approach is to use `createStorageKit()` for centralized initialization. This creates an instance that can be used both as a route handler AND as a service.

```typescript
// store-kit.ts - Centralized initialization
import { createStorageKit } from "@storage-kit/express";

export const storeKit = createStorageKit({
  provider: "minio",
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  defaultBucket: "my-bucket",
});
```

```typescript
// index.ts - Use as route handler
import express from "express";
import { storeKit } from "./store-kit";

const app = express();
app.use(express.json());

// Mount storage endpoints at /api/storage
app.use("/api/storage", storeKit.routeHandler());

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("API Reference: http://localhost:3000/api/storage/reference");
});
```

```typescript
// services/file.service.ts - Use as service
import { storeKit } from "../store-kit";

export async function getUploadUrl(path: string, contentType: string) {
  // "_" uses the defaultBucket configured in store-kit.ts
  return storeKit.getPresignedUploadUrl("_", path, {
    contentType,
    expiresIn: 3600,
  });
}

export async function deleteUserFiles(userId: string, files: string[]) {
  const keys = files.map((f) => `users/${userId}/${f}`);
  return storeKit.deleteFiles("_", keys);
}
```

### Service Methods

When using `createStorageKit()`, you get access to these service methods:

```typescript
// Upload file programmatically
const result = await storeKit.uploadFile(
  "_",
  buffer,
  "avatar.png",
  "users/123",
  {
    contentType: "image/png",
  }
);

// Generate presigned URL for upload
const uploadUrl = await storeKit.getPresignedUploadUrl("_", "files/doc.pdf", {
  contentType: "application/pdf",
  expiresIn: 3600,
});

// Generate presigned URL for download
const downloadUrl = await storeKit.getPresignedDownloadUrl(
  "_",
  "files/doc.pdf",
  {
    expiresIn: 3600,
  }
);

// Delete single file
await storeKit.deleteFile("_", "users/123/avatar.png");

// Bulk delete files
await storeKit.deleteFiles("_", ["file1.png", "file2.png"]);

// Health check
const health = await storeKit.healthCheck();

// Get bucket-scoped service for simpler API
const avatarBucket = storeKit.bucket("avatars");
await avatarBucket.uploadFile(buffer, "user123.png");

// Access underlying storage service for advanced operations
const storageService = storeKit.storage;
```

### Legacy API

The original `storageKit()` function is still available for backward compatibility:

```typescript
import express from "express";
import { storageKit } from "@storage-kit/express";

const app = express();
app.use(express.json());

// Mount storage endpoints at /api/storage
app.use(
  "/api/storage",
  storageKit({
    provider: "minio",
    endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  })
);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("API Reference: http://localhost:3000/api/storage/reference");
});
```

### Available Endpoints

| Method   | Path                                   | Description    |
| -------- | -------------------------------------- | -------------- |
| `GET`    | `/api/storage/reference`               | Swagger UI     |
| `GET`    | `/api/storage/health`                  | Health check   |
| `POST`   | `/api/storage/:bucket/files`           | Upload file    |
| `DELETE` | `/api/storage/:bucket/files/:filePath` | Delete file    |
| `DELETE` | `/api/storage/:bucket/files`           | Bulk delete    |
| `GET`    | `/api/storage/:bucket/signed-url`      | Get signed URL |

### Configuration Options

```typescript
const storeKit = createStorageKit({
  // Required
  provider: "minio", // "minio" | "backblaze" | "cloudflare-r2"

  // Provider credentials
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  region: "us-east-1",
  publicUrlBase: "https://cdn.example.com",

  // Upload options
  defaultBucket: "my-bucket", // Use when bucket is "_"
  maxFileSize: 10 * 1024 * 1024, // 10MB (default)
  allowedMimeTypes: ["image/*", "application/pdf"],

  // Swagger UI
  swagger: true, // Enable (default)
  // swagger: false, // Disable
  // swagger: { path: "/docs", title: "My API" }, // Customize

  // Hooks
  onUploadComplete: (result) => console.log("Uploaded:", result),
  onError: (error) => console.error("Error:", error),
});
```

---

## Fastify Integration

### Installation

```bash
npm install @storage-kit/fastify fastify
# or
pnpm add @storage-kit/fastify fastify
```

### Unified API (Recommended) ✨

```typescript
// store-kit.ts - Centralized initialization
import { createStorageKit } from "@storage-kit/fastify";

export const storeKit = createStorageKit({
  provider: "minio",
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  defaultBucket: "my-bucket",
});
```

```typescript
// index.ts - Use as Fastify plugin
import Fastify from "fastify";
import { storeKit } from "./store-kit";

const fastify = Fastify();

// Register storage plugin
fastify.register(storeKit.plugin(), { prefix: "/api/storage" });

fastify.listen({ port: 3000 }, () => {
  console.log("Server running on http://localhost:3000");
  console.log("API Reference: http://localhost:3000/api/storage/reference");
});
```

```typescript
// services/file.service.ts - Use as service
import { storeKit } from "../store-kit";

export async function getUploadUrl(path: string, contentType: string) {
  return storeKit.getPresignedUploadUrl("_", path, {
    contentType,
    expiresIn: 3600,
  });
}
```

### Legacy API

The original `storageKitPlugin` is still available for backward compatibility:

```typescript
import Fastify from "fastify";
import { storageKitPlugin } from "@storage-kit/fastify";

const fastify = Fastify();

// Register storage plugin
fastify.register(storageKitPlugin, {
  prefix: "/api/storage",
  provider: "minio",
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

fastify.listen({ port: 3000 });
```

### Available Endpoints

| Method   | Path                                   | Description    |
| -------- | -------------------------------------- | -------------- |
| `GET`    | `/api/storage/reference`               | Swagger UI     |
| `GET`    | `/api/storage/health`                  | Health check   |
| `POST`   | `/api/storage/:bucket/files`           | Upload file    |
| `DELETE` | `/api/storage/:bucket/files/:filePath` | Delete file    |
| `DELETE` | `/api/storage/:bucket/files`           | Bulk delete    |
| `GET`    | `/api/storage/:bucket/signed-url`      | Get signed URL |

---

## Hono Integration

### Installation

```bash
npm install @storage-kit/hono hono
# or
pnpm add @storage-kit/hono hono
```

### Unified API (Recommended) ✨

```typescript
// store-kit.ts - Centralized initialization
import { createStorageKit } from "@storage-kit/hono";

export const storeKit = createStorageKit({
  provider: "cloudflare-r2",
  endpoint: "https://account.r2.cloudflarestorage.com",
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  defaultBucket: "my-bucket",
});
```

```typescript
// index.ts - Use as Hono app
import { Hono } from "hono";
import { storeKit } from "./store-kit";

const app = new Hono();

// Mount storage endpoints
app.route("/api/storage", storeKit.routeHandler());

export default app;
```

```typescript
// services/file.service.ts - Use as service
import { storeKit } from "../store-kit";

export async function getUploadUrl(path: string, contentType: string) {
  return storeKit.getPresignedUploadUrl("_", path, {
    contentType,
    expiresIn: 3600,
  });
}
```

### Cloudflare Workers Example

```typescript
import { Hono } from "hono";
import { createStorageKit } from "@storage-kit/hono";

const storeKit = createStorageKit({
  provider: "cloudflare-r2",
  endpoint: "https://your-account.r2.cloudflarestorage.com",
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  defaultBucket: "my-bucket",
});

const app = new Hono();
app.route("/storage", storeKit.routeHandler());

// Swagger UI at: /storage/reference
export default app;
```

### Legacy API

The original `storageKit()` function is still available for backward compatibility:

```typescript
import { Hono } from "hono";
import { storageKit } from "@storage-kit/hono";

const app = new Hono();

app.route(
  "/api/storage",
  storageKit({
    provider: "cloudflare-r2",
    endpoint: "https://account.r2.cloudflarestorage.com",
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  })
);

export default app;
```

### Available Endpoints

| Method   | Path                                   | Description    |
| -------- | -------------------------------------- | -------------- |
| `GET`    | `/api/storage/reference`               | Swagger UI     |
| `GET`    | `/api/storage/health`                  | Health check   |
| `POST`   | `/api/storage/:bucket/files`           | Upload file    |
| `DELETE` | `/api/storage/:bucket/files/:filePath` | Delete file    |
| `DELETE` | `/api/storage/:bucket/files`           | Bulk delete    |
| `GET`    | `/api/storage/:bucket/signed-url`      | Get signed URL |

---

## NestJS Integration

### Installation

```bash
npm install @storage-kit/nestjs @nestjs/platform-express
# or
pnpm add @storage-kit/nestjs @nestjs/platform-express
```

### Setup Module

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { StorageKitModule } from "@storage-kit/nestjs";

@Module({
  imports: [
    StorageKitModule.forRoot({
      provider: "minio",
      endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    }),
  ],
})
export class AppModule {}
```

### Enable Swagger UI

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { StorageKitModule } from "@storage-kit/nestjs";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Swagger UI at /reference
  StorageKitModule.setupSwagger(app);

  await app.listen(3000);
  console.log("Server running on http://localhost:3000");
  console.log("API Reference: http://localhost:3000/reference");
}
bootstrap();
```

### Async Configuration

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StorageKitModule } from "@storage-kit/nestjs";

@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageKitModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        provider: "minio",
        endpoint: config.get("MINIO_ENDPOINT"),
        accessKeyId: config.get("MINIO_ACCESS_KEY"),
        secretAccessKey: config.get("MINIO_SECRET_KEY"),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Available Endpoints

| Method   | Path                       | Description    |
| -------- | -------------------------- | -------------- |
| `GET`    | `/reference`               | Swagger UI     |
| `GET`    | `/health`                  | Health check   |
| `POST`   | `/:bucket/files`           | Upload file    |
| `DELETE` | `/:bucket/files/:filePath` | Delete file    |
| `DELETE` | `/:bucket/files`           | Bulk delete    |
| `GET`    | `/:bucket/signed-url`      | Get signed URL |

### Use as Service (Dependency Injection)

```typescript
// avatar.service.ts
import { Injectable } from "@nestjs/common";
import { StorageKitService } from "@storage-kit/nestjs";

@Injectable()
export class AvatarService {
  constructor(private readonly storage: StorageKitService) {}

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    return this.storage.handleUpload(
      "avatars-bucket",
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      `users/${userId}`
    );
  }

  async deleteAvatar(userId: string, filename: string) {
    return this.storage.handleDelete(
      "avatars-bucket",
      `users/${userId}/${filename}`
    );
  }

  async getSignedUploadUrl(userId: string, filename: string) {
    return this.storage.handleSignedUrl(
      "avatars-bucket",
      `users/${userId}/${filename}`,
      "upload",
      { expiresIn: 3600 }
    );
  }
}
```

### Using in Controller

```typescript
// avatar.controller.ts
import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AvatarService } from "./avatar.service";

@Controller("avatars")
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post(":userId")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Param("userId") userId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.avatarService.uploadAvatar(file, userId);
  }

  @Delete(":userId/:filename")
  async delete(
    @Param("userId") userId: string,
    @Param("filename") filename: string
  ) {
    return this.avatarService.deleteAvatar(userId, filename);
  }
}
```

### Direct Storage Service Access

For advanced use cases, inject the underlying storage service:

```typescript
import { Injectable, Inject } from "@nestjs/common";
import { STORAGE_KIT_SERVICE, type IStorageService } from "@storage-kit/nestjs";

@Injectable()
export class AdvancedService {
  constructor(
    @Inject(STORAGE_KIT_SERVICE)
    private readonly storage: IStorageService
  ) {}

  async customOperation() {
    const bucket = this.storage.getBucket("my-bucket");

    // Direct access to all storage methods
    const uploadResult = await bucket.uploadFile(buffer, "file.png", "path");
    const downloadUrl = await bucket.getPresignedDownloadUrl("file.png");
    const health = await this.storage.healthCheck();

    return { uploadResult, downloadUrl, health };
  }
}
```

---

## Providers

### MinIO

```typescript
import { createStorageService } from "@storage-kit/core";

const storage = createStorageService("minio", {
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  region: "us-east-1",
  publicUrlBase: "https://cdn.example.com",
});
```

### Backblaze B2

```typescript
const storage = createStorageService("backblaze", {
  endpoint: "https://s3.us-west-001.backblazeb2.com",
  accessKeyId: "your-key-id",
  secretAccessKey: "your-application-key",
  region: "us-west-001",
  publicUrlBase: "https://f001.backblazeb2.com/file",
});
```

### Cloudflare R2

```typescript
const storage = createStorageService("cloudflare-r2", {
  endpoint: "https://<account-id>.r2.cloudflarestorage.com",
  accessKeyId: "your-access-key-id",
  secretAccessKey: "your-secret-access-key",
  publicUrlBase: "https://your-custom-domain.com",
});
```

---

## API Reference

### Upload File

```typescript
const result = await storage
  .getBucket("my-bucket")
  .uploadFile(file, "filename.png", "optional/folder", {
    contentType: "image/png",
    upsert: true,
  });

// Returns: { url: string, key: string }
```

### Delete File

```typescript
await storage.getBucket("my-bucket").deleteFile("folder/file.png");
```

### Bulk Delete

```typescript
const result = await storage
  .getBucket("my-bucket")
  .deleteFiles(["file1.png", "folder/file2.png"]);

// Returns: { deleted: number, failed: Array<{ key: string, reason: string }> }
```

### Get Presigned Upload URL

```typescript
const result = await storage
  .getBucket("my-bucket")
  .getPresignedUploadUrl("avatars/profile.png", {
    contentType: "image/png",
    expiresIn: 3600,
  });

// Returns: { signedUrl: string, publicUrl: string, expiresAt: Date }
```

### Get Presigned Download URL

```typescript
const result = await storage
  .getBucket("my-bucket")
  .getPresignedDownloadUrl("avatars/profile.png", { expiresIn: 3600 });

// Returns: { signedUrl: string, expiresAt: Date }
```

### Health Check

```typescript
const health = await storage.healthCheck();

// Returns: { status: 'healthy' | 'unhealthy', provider?: string, error?: string }
```

---

## Error Handling

All errors are thrown as `StorageError` with consistent error codes:

```typescript
import { StorageError } from "@storage-kit/core";

try {
  await storage.getBucket("my-bucket").deleteFile("missing-file.png");
} catch (error) {
  if (error instanceof StorageError) {
    console.log(error.code); // 'FILE_NOT_FOUND'
    console.log(error.message); // 'The requested file does not exist'
    console.log(error.details); // { key: 'missing-file.png', bucket: 'my-bucket' }
  }
}
```

### Error Codes

| Code                      | HTTP Status | Description                             |
| ------------------------- | ----------- | --------------------------------------- |
| `BUCKET_NOT_FOUND`        | 404         | The specified bucket does not exist     |
| `FILE_NOT_FOUND`          | 404         | The requested file does not exist       |
| `MISSING_FILE`            | 400         | No file provided in upload request      |
| `MISSING_REQUIRED_PARAM`  | 400         | A required parameter is missing         |
| `INVALID_SIGNED_URL_TYPE` | 400         | Invalid signed URL type                 |
| `EMPTY_KEYS_ARRAY`        | 400         | The keys array for bulk delete is empty |
| `KEYS_LIMIT_EXCEEDED`     | 400         | The keys array exceeds 1000 items       |
| `UPLOAD_FAILED`           | 500         | File upload failed                      |
| `DELETE_FAILED`           | 500         | File deletion failed                    |
| `SIGNED_URL_FAILED`       | 500         | Failed to generate presigned URL        |
| `PROVIDER_ERROR`          | 500         | General provider error                  |

---

## Environment Variables

### MinIO

| Variable           | Description           | Default                 |
| ------------------ | --------------------- | ----------------------- |
| `MINIO_ENDPOINT`   | MinIO server endpoint | `http://localhost:9000` |
| `MINIO_ACCESS_KEY` | Access key ID         | `minioadmin`            |
| `MINIO_SECRET_KEY` | Secret access key     | `minioadmin`            |

### Backblaze B2

| Variable                    | Description               |
| --------------------------- | ------------------------- |
| `BACKBLAZE_ENDPOINT`        | B2 S3-compatible endpoint |
| `BACKBLAZE_KEY_ID`          | Application key ID        |
| `BACKBLAZE_APPLICATION_KEY` | Application key           |
| `BACKBLAZE_REGION`          | B2 region                 |
| `BACKBLAZE_PUBLIC_URL`      | Public download URL base  |

### Cloudflare R2

| Variable                          | Description               |
| --------------------------------- | ------------------------- |
| `CLOUDFLARE_R2_ENDPOINT`          | R2 S3-compatible endpoint |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`     | R2 access key ID          |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 secret access key      |
| `CLOUDFLARE_R2_PUBLIC_URL`        | Public URL base           |

---

## Examples

Check out the [examples](./examples) directory for complete working examples:

- [Express Server with Swagger UI](./examples/express-server)

---

## License

MIT
