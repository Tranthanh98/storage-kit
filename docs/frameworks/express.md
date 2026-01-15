# Express Integration

<p style="display: flex; gap: 6px; align-items: center;">
  <a href="https://www.npmjs.com/package/@storage-kit/express"><img src="https://nodei.co/npm/@storage-kit/express.svg?style=shields&data=n,v" alt="npm version" style="border-radius: 6px;"></a>
  <a href="https://github.com/Tranthanh98/storage-kit"><img src="https://img.shields.io/github/stars/Tranthanh98/storage-kit.svg?style=flat-square&colorA=18181b&colorB=28CF8D" alt="GitHub stars" style="border-radius: 6px;"></a>
</p>

The `@storage-kit/express` adapter allows you to quickly add storage endpoints to your Express application.

## Setup

1. Install dependencies:

   ```bash
   npm install @storage-kit/express express
   ```

2. Initialize and mount:

   ```typescript
   import express from "express";
   import { createStorageKit } from "@storage-kit/express";

   const app = express();
   app.use(express.json());

   // 1. Configure
   const storeKit = createStorageKit({
     provider: "minio",
     endpoint: "http://localhost:9000",
     accessKeyId: "minioadmin",
     secretAccessKey: "minioadmin",
     defaultBucket: "uploads",
   });

   // 2. Mount Routes
   app.use("/api/storage", storeKit.routeHandler());

   app.listen(3000, () => {
     console.log("Server running on http://localhost:3000");
   });
   ```

## Multi-Provider Configuration

Storage Kit supports configuring multiple storage providers and switching between them at runtime:

```typescript
import { createStorageKit } from "@storage-kit/express";

const storeKit = createStorageKit({
  provider: "minio", // Default provider
  providers: {
    minio: {
      endpoint: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    },
    "cloudflare-r2": {
      endpoint: "https://account.r2.cloudflarestorage.com",
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  },
  defaultBucket: "uploads",
});

// Use default provider
await storeKit.deleteFile("_", "file.png");

// Switch to R2 for specific operation
await storeKit.useProvider("cloudflare-r2").deleteFile("_", "cdn-file.png");

// Get bucket-scoped service for a provider
const r2Bucket = storeKit.useProvider("cloudflare-r2").bucket("images");
await r2Bucket.uploadFile(buffer, "photo.jpg");
```

See the [Multi-Provider Guide](/guide/multi-provider) for more details.

## Service Methods

Use the instance directly for programmatic operations:

```typescript
// Upload file
const result = await storeKit.uploadFile("_", buffer, "avatar.png", "users/123");

// Generate presigned URL
const url = await storeKit.getPresignedUploadUrl("_", "files/doc.pdf", {
  contentType: "application/pdf",
  expiresIn: 3600,
});

// Delete file
await storeKit.deleteFile("_", "users/123/avatar.png");

// Health check
const health = await storeKit.healthCheck();
```

## Example

Check out the full [Express Example](https://github.com/Tranthanh98/storage-kit/tree/main/examples/express-server).
