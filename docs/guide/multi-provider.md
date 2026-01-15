# Multi-Provider Configuration

Storage Kit supports configuring multiple storage providers in a single instance and switching between them dynamically at runtime. This is useful for multi-region deployments, hybrid cloud strategies, migrations, and redundancy.

## Use Cases

- **Multi-region deployments** - Store files closer to users by routing to region-specific providers
- **Hybrid cloud** - Use different providers for different use cases (e.g., R2 for CDN, S3 for archives)
- **Migration** - Gradually migrate from one provider to another without downtime
- **Redundancy** - Upload to multiple providers for backup and disaster recovery
- **Cost optimization** - Route uploads to cheaper storage for certain file types

## Configuration

To enable multi-provider mode, use the `providers` map in your configuration:

```typescript
import { createStorageKit } from "@storage-kit/express";

const storeKit = createStorageKit({
  // Default provider - used when no provider is specified
  provider: "minio",
  
  // Map of all configured providers (key = provider type)
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
    s3: {
      region: "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    azure: {
      connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    },
  },
  
  // Shared configuration
  defaultBucket: "my-bucket",
  maxFileSize: 50 * 1024 * 1024, // 50MB
});
```

## Provider Types

| Type           | Description                    | Required Config                              |
| -------------- | ------------------------------ | -------------------------------------------- |
| `minio`        | MinIO                          | `endpoint`, `accessKeyId`, `secretAccessKey` |
| `s3`           | Amazon S3                      | `region`, `accessKeyId`, `secretAccessKey`   |
| `cloudflare-r2`| Cloudflare R2                  | `endpoint`, `accessKeyId`, `secretAccessKey` |
| `backblaze`    | Backblaze B2                   | `endpoint`, `accessKeyId`, `secretAccessKey` |
| `gcs`          | Google Cloud Storage (S3 API)  | `endpoint`, `accessKeyId`, `secretAccessKey` |
| `spaces`       | DigitalOcean Spaces            | `endpoint`, `accessKeyId`, `secretAccessKey` |
| `azure`        | Azure Blob Storage             | `connectionString`                           |

## Using `useProvider()`

Switch to a specific provider using the `useProvider()` method:

```typescript
// Use default provider (minio)
await storeKit.deleteFile("_", "file.png");

// Switch to R2 for CDN-served files
await storeKit.useProvider("cloudflare-r2").deleteFile("_", "cdn-file.png");

// Switch to S3 for archives
await storeKit.useProvider("s3").bucket("archives").uploadFile(
  buffer,
  "backup.zip"
);

// Get a bucket-scoped service for a specific provider
const r2Images = storeKit.useProvider("cloudflare-r2").bucket("images");
await r2Images.uploadFile(buffer, "photo.jpg");
await r2Images.deleteFile("old-photo.jpg");
```

## API Reference

### `useProvider(providerName: string)`

Returns a provider-scoped storage kit instance.

**Parameters:**
- `providerName` - The name of the provider as defined in the `providers` map

**Returns:** `IProviderScopedStorageKit` - An object with the same API as the main storage kit, but scoped to the specified provider

**Throws:** `StorageError` with code `PROVIDER_NOT_CONFIGURED` if the provider is not found

### `IProviderScopedStorageKit`

The provider-scoped instance has the following methods:

| Method                       | Description                              |
| ---------------------------- | ---------------------------------------- |
| `uploadFile()`               | Upload a file to storage                 |
| `deleteFile()`               | Delete a single file                     |
| `deleteFiles()`              | Delete multiple files                    |
| `getPresignedUploadUrl()`    | Get a presigned URL for upload           |
| `getPresignedDownloadUrl()`  | Get a presigned URL for download         |
| `healthCheck()`              | Check the health of the provider         |
| `bucket()`                   | Get a bucket-scoped service              |
| `storage`                    | Access the underlying `IStorageService`  |

## Real-World Examples

### Hybrid Cloud: CDN + Archive

Use different providers for different purposes - R2 for CDN-served content and S3 for long-term archives:

```typescript
const storeKit = createStorageKit({
  provider: "cloudflare-r2",
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
});

// Hot storage for frequently accessed files
await storeKit.useProvider("cloudflare-r2").bucket("cdn").uploadFile(buffer, "image.jpg");

// Cold storage for archives
await storeKit.useProvider("s3").bucket("archives").uploadFile(
  largeBackup,
  "backup-2024.zip"
);
```

### Development vs Production

Use MinIO for local development and S3 for production:

```typescript
const isDev = process.env.NODE_ENV === "development";

const storeKit = createStorageKit({
  provider: isDev ? "minio" : "s3",
  providers: {
    minio: {
      endpoint: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    },
    s3: {
      region: "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  },
  defaultBucket: "uploads",
});

// Code works the same way in both environments
await storeKit.uploadFile("_", buffer, "file.png");
```

### Migration Pattern

Migrate from one provider to another by writing to both during transition:

```typescript
const storeKit = createStorageKit({
  provider: "minio", // Old provider (will be deprecated)
  providers: {
    minio: {
      endpoint: "http://old-server:9000",
      accessKeyId: "...",
      secretAccessKey: "...",
    },
    "cloudflare-r2": {
      endpoint: "https://account.r2.cloudflarestorage.com",
      accessKeyId: "...",
      secretAccessKey: "...",
    },
  },
});

// During migration: write to both, read from new first
async function uploadWithMigration(file: Buffer, key: string) {
  // Write to new provider first
  const result = await storeKit.useProvider("cloudflare-r2")
    .bucket("uploads")
    .uploadFile(file, key);
  
  // Also write to old provider for safety
  await storeKit.useProvider("minio")
    .bucket("uploads")
    .uploadFile(file, key);
  
  return result;
}
```

> **Note:** Each provider type can only be configured once in the `providers` map. The provider key must be a valid `StorageProvider` type (`minio`, `s3`, `cloudflare-r2`, `backblaze`, `gcs`, `spaces`, or `azure`).
```

## Error Handling

```typescript
import { StorageError } from "@storage-kit/core";

try {
  await storeKit.useProvider("nonexistent").deleteFile("_", "file.png");
} catch (error) {
  if (error instanceof StorageError && error.code === "PROVIDER_NOT_CONFIGURED") {
    console.error("Provider not found:", error.details.requestedProvider);
    console.log("Available providers:", error.details.availableProviders);
  }
}
```

## Backward Compatibility

Multi-provider mode is fully backward compatible. If you don't use the `providers` map, everything works exactly as before:

```typescript
// Single-provider mode (unchanged)
const storeKit = createStorageKit({
  provider: "minio",
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
});

// You can still use useProvider() with the default provider name
await storeKit.useProvider("minio").deleteFile("bucket", "file.png");
```

## NestJS Integration

In NestJS, inject `StorageKitService` and use `useProvider()`:

```typescript
import { Injectable } from "@nestjs/common";
import { StorageKitService } from "@storage-kit/nestjs";

@Injectable()
export class FileService {
  constructor(private readonly storage: StorageKitService) {}

  async uploadToCDN(file: Buffer, filename: string) {
    return this.storage.useProvider("cloudflare-r2").uploadFile("cdn", file, filename);
  }

  async archiveFile(file: Buffer, filename: string) {
    return this.storage.useProvider("s3").uploadFile("archives", file, filename);
  }
}
```
