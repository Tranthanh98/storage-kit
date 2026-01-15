# Hono Integration

The `@storage-kit/hono` adapter is edge-compatible and works great with Cloudflare Workers.

## Installation

```bash
npm install @storage-kit/hono hono
# or
pnpm add @storage-kit/hono hono
```

## Unified API (Recommended) ✨

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
