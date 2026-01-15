# Design: Storage Kit HTTP API

## Context

The Storage Kit is designed as a reusable npm package that wraps S3-compatible storage providers (MinIO, Backblaze B2, Cloudflare R2) with a unified interface. The HTTP API layer needs to be:

- Framework-agnostic (usable with Express, Fastify, Hono, etc.)
- Provider-agnostic (same API regardless of backend storage)
- Packageable as a standalone npm module

## Goals

- Define a clear, RESTful API contract via OpenAPI 3.x
- Support all core storage operations: upload, delete, signed URL generation
- Provide consistent error responses
- Enable both server-side uploads and client-side presigned uploads
- Keep the API minimal yet complete

## Non-Goals

- Authentication/authorization (delegated to consuming application)
- Provider-specific configuration endpoints
- Real-time streaming/chunked uploads (future enhancement)
- File listing/browsing (out of scope for v1)

## Decisions

### 1. URL Structure

**Decision**: Use `/storage/{bucket}/...` path pattern
**Rationale**:

- Bucket as path parameter allows clear resource hierarchy
- Consistent with S3-style addressing
- Supports multiple buckets in single deployment

### 2. File Path Handling

**Decision**: Use URL-encoded file paths in path parameter
**Rationale**:

- `DELETE /storage/{bucket}/files/{filePath}` where filePath can be `folder%2Fsubfolder%2Fimage.png`
- Avoids need for request body on DELETE
- Clear RESTful resource addressing

### 3. Signed URL Types

**Decision**: Single endpoint with `type` query parameter
**Rationale**:

- `GET /storage/{bucket}/signed-url?key=file.png&type=upload` for PUT presigned URL
- `GET /storage/{bucket}/signed-url?key=file.png&type=download` for GET presigned URL
- Simpler than separate endpoints, clear intent

### 4. Error Response Format

**Decision**: Consistent JSON error schema

```json
{
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "The requested file does not exist",
    "details": { "key": "folder/file.png", "bucket": "my-bucket" }
  }
}
```

**Rationale**:

- Machine-readable error codes for programmatic handling
- Human-readable messages for debugging
- Optional details for context

### 5. Multipart Upload

**Decision**: Use standard multipart/form-data for file uploads
**Rationale**:

- Universal browser and HTTP client support
- `file` field for binary data
- Optional `path` field for folder prefix
- Optional `contentType` field for MIME type override

## Alternatives Considered

### Base64 Upload vs Multipart

- **Rejected**: Base64 increases payload size by ~33% and requires encoding/decoding overhead
- **Chosen**: Multipart/form-data is standard, efficient, and well-supported

### Separate Upload/Download Signed URL Endpoints

- **Rejected**: Creates API surface bloat without clear benefit
- **Chosen**: Single endpoint with `type` parameter is cleaner

### File Path in Request Body for DELETE

- **Rejected**: Non-standard REST pattern, complicates caching
- **Chosen**: URL-encoded path parameter follows REST conventions

## Risks & Mitigations

| Risk                                  | Mitigation                                                     |
| ------------------------------------- | -------------------------------------------------------------- |
| Long file paths exceed URL limits     | Document max path length (2048 chars), recommend shorter paths |
| Provider-specific errors leak through | Map all provider errors to standard error codes                |
| Large file uploads timeout            | Document chunked upload as future enhancement                  |

## Open Questions

None - ready for implementation after approval.
