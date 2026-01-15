## Context
The project strictly uses `aws-sdk` for S3-compatible providers (MinIO, R2, B2). The user requests support for Amazon S3, GCS, Azure, and DigitalOcean Spaces.
While S3, GCS, and Spaces are S3-compatible, Azure Blob Storage is not.

## Goals
- Support Amazon S3, GCS, Azure, DigitalOcean Spaces.
- Maintain consistent `IStorageService` interface.
- Minimize external dependencies where possible.

## Decisions

### 1. Azure Blob Storage Strategy
**Decision**: Use native `@azure/storage-blob` SDK.
**Rationale**: Azure's S3 gateway is not a standard or recommended approach for new applications. Native SDK ensures full feature support and reliability.
**Trade-off**: Introduces a new dependency family (`@azure/*`) and breaks the "only aws-sdk" architecture pattern. This is acceptable for the value of native support.

### 2. Google Cloud Storage Strategy
**Decision**: Use S3 Interoperability (XML API) via `aws-sdk`.
**Rationale**: GCS provides robust S3 compatibility. Using `aws-sdk` avoids adding the heavy `@google-cloud/storage` library, keeping the package size smaller. The core operations (upload, download, delete, signed URLs) are fully supported in interoperability mode.

### 3. Storage Configuration Refactoring
**Decision**: Refactor `StorageConfig` into a discriminated union type.
**Rationale**: S3 and Azure require different credential sets (Access Key/Secret vs Connection String or Account/Key). A union type ensures type safety.
```typescript
type StorageConfig = S3Config | AzureConfig;
```

## Risks
- **Azure Feature Parity**: Azure's SAS tokens work slightly differently than S3 Presigned URLs. We must ensure `getPresignedUploadUrl` behavior is consistent (e.g., enforcing content type).
- **GCS S3 Interop**: Requires users to generate HMAC keys, which is a specific setup step. We must document this clearly.
