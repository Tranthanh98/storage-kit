# Change: Add Framework Adapters for HTTP Integration

## Why

The Storage Kit currently provides a low-level `IStorageService` interface that requires manual HTTP handler implementation for each framework. Developers using Express, Fastify, Hono, or NestJS must write boilerplate code to:

- Parse multipart file uploads
- Handle route parameters and query strings
- Map storage errors to HTTP responses
- Configure routes manually

This friction reduces adoption and leads to inconsistent implementations. A framework adapter pattern (similar to better-auth, tRPC, or Hono middleware) would allow developers to integrate storage functionality with a single line of code:

```typescript
app.use("/api/storage", storageKit({ provider: "minio", ... }))
```

## What Changes

### New Capabilities

- **Express Adapter** (`@storage-kit/express`): Router middleware for Express.js
- **Fastify Adapter** (`@storage-kit/fastify`): Plugin for Fastify
- **Hono Adapter** (`@storage-kit/hono`): Middleware for Hono (edge-compatible)
- **NestJS Adapter** (`@storage-kit/nestjs`): Module and decorators for NestJS

### Common Adapter Features

All adapters SHALL:

1. Implement all endpoints defined in `openapi/storage-api.yaml`
2. Handle multipart file parsing using framework-native or minimal dependencies
3. Support bucket selection via URL path parameter (`/storage/:bucket/files`)
4. Map `StorageError` to appropriate HTTP responses automatically
5. Allow custom route prefix configuration
6. Support middleware/guard integration for authentication (delegated to consuming app)

### Package Structure

```
packages/
├── core/          # Existing @storage-kit/core
├── express/       # @storage-kit/express
├── fastify/       # @storage-kit/fastify
├── hono/          # @storage-kit/hono
└── nestjs/        # @storage-kit/nestjs
```

### Breaking Changes

None - this is additive functionality. Existing `@storage-kit/core` exports remain unchanged.

## Impact

- **Affected specs**: `storage-api` (reference only, no changes)
- **New specs**: `framework-adapters` (new capability)
- **Affected code**: None (additive)
- **New packages**:
  - `@storage-kit/express`
  - `@storage-kit/fastify`
  - `@storage-kit/hono`
  - `@storage-kit/nestjs`
- **New dependencies per adapter**:
  - Express: `multer` (file upload parsing)
  - Fastify: `@fastify/multipart`
  - Hono: built-in multipart parsing
  - NestJS: `@nestjs/platform-express`, `multer`
