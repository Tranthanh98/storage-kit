# Design: Client SDK Package

## Context

Storage Kit provides HTTP APIs for file storage operations. Frontend applications need a convenient, type-safe way to interact with these APIs without writing boilerplate fetch code. The design follows the `better-auth/client` pattern for familiarity.

**Stakeholders**: Frontend developers using React, React Native, Vue, Angular, or vanilla JavaScript/TypeScript

**Constraints**:
- Must work in browsers and React Native (no Node.js-specific APIs)
- Zero runtime dependencies (keep bundle size minimal)
- Must support custom fetch implementations for testing/mocking
- Must align with existing Storage Kit API response formats

## Goals / Non-Goals

**Goals**:
- Provide a minimal, type-safe client SDK for Storage Kit HTTP API
- Support all storage operations: upload, delete, bulk delete, signed URLs, health check
- Work in any JavaScript environment with fetch support
- Enable progress tracking for uploads
- Provide consistent error handling with typed errors

**Non-Goals**:
- Framework-specific hooks (useUpload, useStorage) - may add later in separate packages
- Offline support or request queuing
- File chunking or resumable uploads (use signed URLs for large files)
- Caching layer

## Decisions

### 1. Factory Function Pattern

**Decision**: Use `createStorageClient(config)` factory pattern

**Alternatives Considered**:
- **Class instantiation** (`new StorageClient(config)`) - Less tree-shakable
- **Singleton** (`initStorage()` + `storage.upload()`) - Global state issues

**Rationale**: Factory pattern matches `better-auth/client`, enables tree-shaking, and avoids `this` binding issues.

```typescript
import { createStorageClient } from "@storage-kit/client";

const storage = createStorageClient({
  baseURL: "http://localhost:3000/storage",
});
```

### 2. Result Pattern for Error Handling

**Decision**: Return `{ data, error }` tuple pattern instead of throwing

**Alternatives Considered**:
- **Throw on error** - Requires try/catch everywhere
- **Result class** (`Result<T, E>`) - Over-engineering for this use case

**Rationale**: Matches `better-auth/client` pattern, TypeScript narrows types nicely, explicit error handling.

```typescript
const { data, error } = await storage.upload({
  bucket: "avatars",
  file: file,
  path: "users/123",
});

if (error) {
  console.error(error.code, error.message);
  return;
}

console.log(data.url, data.key);
```

### 3. Configurable Fetch

**Decision**: Accept custom `fetch` function in config

**Rationale**: Enables React Native compatibility, test mocking, and adding auth headers.

```typescript
const storage = createStorageClient({
  baseURL: "http://localhost:3000/storage",
  fetch: customFetch, // Optional, defaults to global fetch
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 4. Bucket as Method Parameter

**Decision**: Pass bucket as parameter to each method, not in client config

**Alternatives Considered**:
- **Bucket in config** (`createStorageClient({ bucket: "uploads" })`) - Less flexible
- **Scoped client** (`storage.bucket("uploads").upload()`) - More verbose

**Rationale**: Most apps use multiple buckets (avatars, documents, etc.), per-call bucket is more practical. Use `_` for default bucket.

### 5. File Input Handling

**Decision**: Accept `File`, `Blob`, or `{ buffer, name, type }` for uploads

**Rationale**: `File` for browser file inputs, `Blob` for generated content, object form for React Native/Node.js where `File` may not exist.

```typescript
// Browser - File from input
await storage.upload({ bucket: "docs", file: inputFile });

// React Native - Buffer with metadata
await storage.upload({
  bucket: "docs",
  file: {
    buffer: imageBuffer,
    name: "photo.jpg",
    type: "image/jpeg",
  },
});
```

## API Reference

### Client Configuration

```typescript
interface StorageClientConfig {
  /** Base URL of Storage Kit server (e.g., "http://localhost:3000/storage") */
  baseURL: string;
  /** Default bucket name (used when bucket="_") */
  defaultBucket?: string;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /** Default headers for all requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
}
```

### Methods

```typescript
interface StorageClient {
  upload(params: UploadParams): Promise<Result<UploadResponse>>;
  delete(params: DeleteParams): Promise<Result<void>>;
  bulkDelete(params: BulkDeleteParams): Promise<Result<BulkDeleteResponse>>;
  getSignedUrl(params: SignedUrlParams): Promise<Result<SignedUrlResponse>>;
  health(): Promise<Result<HealthResponse>>;
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| No upload progress in basic API | Document using signed URLs for large files with progress |
| Browser `File` API not available in all envs | Support buffer-based alternative |
| API changes in Storage Kit server | Version lock client with server compatibility |

## Migration Plan

Not applicable - this is a new package with no existing users.

## Open Questions

1. **Should we support request interceptors?** - Defer to v1.1, can add later
2. **Should we auto-retry on network errors?** - Defer to v1.1, keep simple initially
