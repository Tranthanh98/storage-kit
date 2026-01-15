# @storage-kit/hono

Hono adapter for Storage Kit - edge-compatible storage HTTP endpoints.

Works with Cloudflare Workers, Deno, Bun, and Node.js.

## Installation

```bash
npm install @storage-kit/hono @storage-kit/core hono
# or
pnpm add @storage-kit/hono @storage-kit/core hono
```

## Quick Start

### Recommended: Centralized Initialization

Create a single `createStorageKit` instance and use it throughout your app:

```typescript
// store-kit.ts
import { createStorageKit } from "@storage-kit/hono";

export const storeKit = createStorageKit({
  provider: "cloudflare-r2",
  endpoint: "https://account.r2.cloudflarestorage.com",
  accessKeyId: "your-access-key",
  secretAccessKey: "your-secret-key",
  defaultBucket: "uploads",
});
```

```typescript
// app.ts
import { Hono } from "hono";
import { storeKit } from "./store-kit";

const app = new Hono();

// Use as route handler
app.route("/api/storage", storeKit.routeHandler());

// Use as service (direct method calls)
app.get("/example/presigned-url", async (c) => {
  const result = await storeKit.getPresignedUploadUrl("_", "uploads/file.png", {
    contentType: "image/png",
    expiresIn: 3600,
  });
  return c.json(result);
});

export default app;
```

**Swagger UI** is automatically available at `/api/storage/reference` - no additional setup required!

## Multi-Provider Configuration

Storage Kit supports configuring multiple storage providers and switching between them at runtime using `useProvider()`. This is useful for multi-region deployments, hybrid cloud strategies, and migrations.

```typescript
// store-kit.ts
import { createStorageKit } from "@storage-kit/hono";

export const storeKit = createStorageKit({
  provider: "cloudflare-r2", // Default provider
  providers: {
    "cloudflare-r2": {
      endpoint: "https://account.r2.cloudflarestorage.com",
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
    s3: {
      region: "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    backblaze: {
      endpoint: "https://s3.us-west-001.backblazeb2.com",
      accessKeyId: process.env.B2_KEY_ID!,
      secretAccessKey: process.env.B2_APP_KEY!,
    },
  },
  defaultBucket: "uploads",
});

// Use default provider (r2)
await storeKit.deleteFile("_", "old-file.png");

// Switch to S3 for specific operation
await storeKit.useProvider("s3").deleteFile("_", "archive-file.png");

// Switch to Backblaze and get bucket-scoped service
const backupBucket = storeKit.useProvider("backblaze").bucket("backups");
await backupBucket.uploadFile(buffer, "daily-backup.zip");
```

See the [Multi-Provider Guide](https://tranthanh98.github.io/storage-kit/guide/multi-provider.html) for more details.

## Cloudflare Workers Example

```typescript
// store-kit.ts
import { createStorageKit } from "@storage-kit/hono";

export const storeKit = createStorageKit({
  provider: "cloudflare-r2",
  endpoint: "https://your-account.r2.cloudflarestorage.com",
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
  defaultBucket: "my-bucket",
});
```

```typescript
// worker.ts
import { Hono } from "hono";
import { storeKit } from "./store-kit";

const app = new Hono();
app.route("/storage", storeKit.routeHandler());

export default app;
```

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

The adapter implements all endpoints defined in the OpenAPI specification:

| Method   | Path                       | Description          |
| -------- | -------------------------- | -------------------- |
| `POST`   | `/:bucket/files`           | Upload a file        |
| `DELETE` | `/:bucket/files/:filePath` | Delete a single file |
| `DELETE` | `/:bucket/files`           | Bulk delete files    |
| `GET`    | `/:bucket/signed-url`      | Generate signed URL  |
| `GET`    | `/health`                  | Health check         |

## Built-in Swagger UI

The adapter includes a built-in interactive API reference powered by Swagger UI. By default, it's available at the `/reference` path relative to your mount point.

### Default Behavior

```typescript
app.route("/api/storage", storeKit.routeHandler());
// Swagger UI available at: /api/storage/reference
```

### Customizing Swagger UI

```typescript
export const storeKit = createStorageKit({
  provider: "cloudflare-r2",
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
  provider: "cloudflare-r2",
  // ... credentials
  swagger: false, // Disable Swagger UI entirely
});
```

## Configuration

```typescript
interface HonoStorageKitConfig {
  // Required
  provider: "minio" | "backblaze" | "cloudflare-r2" | "s3" | "gcs" | "spaces" | "azure";

  // Provider credentials
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  publicUrlBase?: string;
  // Azure specific
  connectionString?: string;
  accountName?: string;
  accountKey?: string;

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

## Features

- Zero additional dependencies for multipart parsing (uses Hono's built-in parser)
- Edge runtime compatible
- Works with Cloudflare Workers, Deno, Bun, and Node.js
- Automatic error handling with proper HTTP status codes

## Error Handling Middleware

```typescript
import { storageErrorMiddleware } from "@storage-kit/hono";

app.use("*", storageErrorMiddleware());
```

## Legacy API (Deprecated)

The `storageKit()` function is deprecated. Please use `createStorageKit()` instead:

```typescript
// ❌ Deprecated
import { storageKit } from "@storage-kit/hono";
app.route("/api/storage", storageKit({ ... }));

// ✅ Recommended
import { createStorageKit } from "@storage-kit/hono";
const storeKit = createStorageKit({ ... });
app.route("/api/storage", storeKit.routeHandler());
```

## License

MIT
