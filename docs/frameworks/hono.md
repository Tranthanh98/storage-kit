# Hono Integration

<p style="display: flex; gap: 6px; align-items: center;">
  <a href="https://www.npmjs.com/package/@storage-kit/hono"><img src="https://nodei.co/npm/@storage-kit/hono.svg?style=shields&data=n,v" alt="npm version" style="border-radius: 6px;"></a>
  <a href="https://github.com/Tranthanh98/storage-kit"><img src="https://img.shields.io/github/stars/Tranthanh98/storage-kit.svg?style=flat-square&colorA=18181b&colorB=28CF8D" alt="GitHub stars" style="border-radius: 6px;"></a>
</p>

The `@storage-kit/hono` adapter is edge-compatible and works great with Cloudflare Workers.

## Installation

```bash
npm install @storage-kit/hono hono
# or
pnpm add @storage-kit/hono hono
```

## Unified API (Recommended)

The recommended approach is to use `createStorageKit()` for centralized initialization.

```typescript
// store-kit.ts
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
// index.ts
import { Hono } from "hono";
import { storeKit } from "./store-kit";

const app = new Hono();

// Mount storage endpoints at /api/storage
app.route("/api/storage", storeKit.routeHandler());

export default app;
```

## Multi-Provider Configuration

Storage Kit supports configuring multiple storage providers and switching between them at runtime:

```typescript
import { createStorageKit } from "@storage-kit/hono";

const storeKit = createStorageKit({
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
  },
  defaultBucket: "uploads",
});

// Use default provider (r2)
await storeKit.deleteFile("_", "file.png");

// Switch to S3 for specific operation
await storeKit.useProvider("s3").deleteFile("_", "archive-file.png");

// Get bucket-scoped service for a provider
const s3Archives = storeKit.useProvider("s3").bucket("archives");
await s3Archives.uploadFile(buffer, "backup.zip");
```

See the [Multi-Provider Guide](/guide/multi-provider) for more details.

## Cloudflare Workers Example

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

## Service Methods

You can also use the client for direct operations in your services:

```typescript
import { storeKit } from "./store-kit";

export async function getUploadUrl(path: string, contentType: string) {
  return storeKit.getPresignedUploadUrl("_", path, {
    contentType,
    expiresIn: 3600,
  });
}
```
