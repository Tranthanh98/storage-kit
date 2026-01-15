# Design: Framework Adapters

## Context

Storage Kit is a framework-agnostic storage abstraction. To maximize adoption and developer experience, we need plug-and-play adapters for popular Node.js frameworks. The pattern is inspired by:

- **better-auth**: `app.use("/auth", betterAuth({...}))`
- **tRPC**: `createExpressMiddleware()`, `fetchRequestHandler()`
- **Hono middleware**: Composable middleware pattern

### Constraints

1. Each adapter must be a separate npm package to avoid bloating the core
2. Adapters must work with the existing `IStorageService` interface
3. File upload parsing must use framework-native or minimal dependencies
4. No authentication logic - consumers handle auth via their own middleware
5. TypeScript-first with full type safety

## Goals

- Zero-configuration setup for common use cases
- Full OpenAPI spec compliance for all endpoints
- Type-safe configuration options
- Framework-idiomatic patterns (decorators for NestJS, plugins for Fastify)

## Non-Goals

- Custom authentication implementations (delegated to consuming app)
- Rate limiting (handled by consuming app or API gateway)
- Multi-provider routing (single provider per adapter instance)
- Streaming/chunked uploads (future enhancement)

## Decisions

### 1. Adapter Factory Pattern

**Decision**: Each adapter exports a factory function that returns framework-native middleware/router.

**Rationale**:

```typescript
// Express
import { storageKit } from "@storage-kit/express"
app.use("/api/storage", storageKit({ provider: "minio", ... }))

// Fastify
import { storageKitPlugin } from "@storage-kit/fastify"
fastify.register(storageKitPlugin, { prefix: "/api/storage", provider: "minio", ... })

// Hono
import { storageKit } from "@storage-kit/hono"
app.route("/api/storage", storageKit({ provider: "minio", ... }))

// NestJS
import { StorageKitModule } from "@storage-kit/nestjs"
@Module({ imports: [StorageKitModule.forRoot({ provider: "minio", ... })] })
```

This matches each framework's conventions and allows seamless integration.

### 2. Shared Request Handler Core

**Decision**: Create a framework-agnostic `StorageHandler` class in `@storage-kit/core` that contains all business logic.

**Rationale**:

- Avoids duplicating validation, error handling, and storage logic across adapters
- Adapters only handle request/response translation
- Easier testing and maintenance

```typescript
// In @storage-kit/core
export class StorageHandler {
  constructor(private storage: IStorageService) {}
  
  async handleUpload(bucket: string, file: UploadedFile, path?: string): Promise<FileUploadResponse>
  async handleDelete(bucket: string, key: string): Promise<void>
  async handleBulkDelete(bucket: string, keys: string[]): Promise<BulkDeleteResponse>
  async handleSignedUrl(bucket: string, key: string, type: "upload"|"download", options?: SignedUrlOptions): Promise<SignedUrlResponse>
  async handleHealthCheck(): Promise<HealthCheckResponse>
}
```

### 3. Configuration Interface

**Decision**: Unified configuration across all adapters with adapter-specific extensions.

```typescript
interface StorageKitConfig {
  // Provider selection (required)
  provider: "minio" | "backblaze" | "cloudflare-r2"
  
  // Provider credentials
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
  region?: string
  publicUrlBase?: string
  
  // Adapter options
  defaultBucket?: string           // Fallback if no bucket in path
  maxFileSize?: number             // Bytes, default 10MB
  allowedMimeTypes?: string[]      // e.g., ["image/*", "application/pdf"]
  
  // Hooks for customization
  onUploadComplete?: (result: FileUploadResponse) => void
  onError?: (error: StorageError) => void
}
```

### 4. Error Response Mapping

**Decision**: Automatically map `StorageError` to HTTP responses using `error.toJSON()`.

**Rationale**:

- Consistent error format across all frameworks
- Developers don't need to handle errors manually
- Matches OpenAPI specification

```typescript
function mapErrorToResponse(error: StorageError): { status: number; body: object } {
  const statusMap: Record<StorageErrorCode, number> = {
    BUCKET_NOT_FOUND: 404,
    FILE_NOT_FOUND: 404,
    MISSING_FILE: 400,
    MISSING_REQUIRED_PARAM: 400,
    INVALID_SIGNED_URL_TYPE: 400,
    EMPTY_KEYS_ARRAY: 400,
    KEYS_LIMIT_EXCEEDED: 400,
    UPLOAD_FAILED: 500,
    DELETE_FAILED: 500,
    SIGNED_URL_FAILED: 500,
    PROVIDER_ERROR: 500,
  }
  return { status: statusMap[error.code] ?? 500, body: error.toJSON() }
}
```

### 5. Multipart Parsing Strategy

**Decision**: Use framework-native or lightweight parsing per adapter.

| Adapter | Parser | Reason |
|---------|--------|--------|
| Express | multer | De-facto standard, well-tested |
| Fastify | @fastify/multipart | Official Fastify plugin |
| Hono | Built-in `c.req.parseBody()` | Edge-compatible, no deps |
| NestJS | multer via @nestjs/platform-express | NestJS convention |

### 6. Route Structure

**Decision**: Match OpenAPI spec routes with configurable prefix.

Default routes (prefix `/storage`):

```
POST   /:bucket/files           → Upload file
DELETE /:bucket/files/:filePath → Delete single file
DELETE /:bucket/files           → Bulk delete files
GET    /:bucket/signed-url      → Generate signed URL
GET    /health                  → Health check
```

## Alternatives Considered

### Monolithic Package

- **Rejected**: Single `@storage-kit/adapters` package with all frameworks
- **Reason**: Bundle size bloat, users pay for adapters they don't use

### Abstract Adapter Base Class

- **Rejected**: Inheritance-based `AbstractAdapter` that adapters extend
- **Reason**: Composition (StorageHandler + thin adapter) is simpler and more testable

### Request/Response Normalization Layer

- **Rejected**: Convert all frameworks to unified Request/Response objects
- **Reason**: Performance overhead, loses framework-specific features

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Framework version compatibility | Pin to major versions, document supported ranges |
| Multipart parsing inconsistencies | Normalize to common `UploadedFile` interface |
| Breaking changes in frameworks | Separate packages allow independent versioning |
| Bundle size for NestJS decorator metadata | Use minimal decorators, avoid reflect-metadata bloat |

## Open Questions

None - ready for implementation after approval.
