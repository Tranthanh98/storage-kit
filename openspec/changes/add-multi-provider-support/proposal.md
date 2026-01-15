# Change: Add Multi-Provider Support

## Why

Currently, Storage Kit only supports configuring a single storage provider per instance. This limits flexibility in real-world scenarios where applications need to interact with multiple storage backends simultaneously. For example, a database record might have a `provider` column indicating where its file is stored (e.g., MinIO for older files, Cloudflare R2 for newer files), requiring the application to dynamically switch providers for operations.

## What Changes

- **ADDED**: New `providers` configuration option to define multiple provider configurations at initialization
- **ADDED**: New `useProvider(providerName)` method that returns a provider-scoped StorageKit instance
- **ADDED**: Validation that throws an error when attempting to use an unconfigured provider
- **MODIFIED**: Configuration structure to support both single-provider (backward compatible) and multi-provider modes

### API Design

```typescript
// Multi-provider configuration
const storageKit = createStorageKit({
  provider: "minio", // Default provider
  providers: {
    minio: {
      endpoint: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    },
    "cloudflare-r2": {
      endpoint: "https://xxx.r2.cloudflarestorage.com",
      accessKeyId: "r2-access-key",
      secretAccessKey: "r2-secret-key",
      region: "auto",
    },
  },
  defaultBucket: "my-bucket",
});

// Use default provider (minio)
await storageKit.bucket("images").deleteFile("old-image.png");

// Switch to a specific provider for an operation
await storageKit.useProvider("cloudflare-r2").bucket("images").deleteFile("new-image.png");
```

### Notes

- Method name `useProvider` is preferred over `setProvider` because it follows functional patterns and clearly indicates it returns a new context rather than mutating state
- The returned object from `useProvider` provides the same API as the main StorageKit instance
- Backward compatibility: existing single-provider configuration continues to work unchanged

## Impact

- **Affected specs**: New `multi-provider` capability
- **Affected code**:
  - `packages/core/handler/types.ts` - New multi-provider config types
  - `packages/core/handler/BaseStorageKit.ts` - Multi-provider storage, `useProvider()` method
  - `packages/express/src/adapter.ts` - Inherit multi-provider support
  - `packages/fastify/src/plugin.ts` - Inherit multi-provider support
  - `packages/hono/src/adapter.ts` - Inherit multi-provider support
  - `packages/nestjs/src/` - Inherit multi-provider support
