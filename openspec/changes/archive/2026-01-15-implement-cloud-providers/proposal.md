# Change: Implement Core Cloud Storage Providers

## Why
The current system only supports MinIO, Backblaze B2, and Cloudflare R2 via generic S3 compatibility. Users need support for major cloud providers including Amazon S3, Google Cloud Storage, Azure Blob Storage, and DigitalOcean Spaces to make the library viable for production use across different infrastructure stacks.

## What Changes
- Add specific provider implementations for:
  - **Amazon S3**: Native AWS support.
  - **Google Cloud Storage**: Via S3 interoperability (to maintain `aws-sdk` consistency).
  - **DigitalOcean Spaces**: Via S3 compatibility.
  - **Azure Blob Storage**: Native support using `@azure/storage-blob` (requires new dependency).
- Refactor `StorageConfig` to support provider-specific configuration (S3 vs Azure).
- Update `StorageFactory` (if exists) or export new service classes.

## Impact
- **Affected specs**: New `providers` capability.
- **Affected code**: `packages/core/providers/`, `StorageConfig` interface.
- **Dependencies**: Add `@azure/storage-blob` and `@azure/storage-blob-sas`.
- **Breaking**: `StorageConfig` will change from a flat interface to a discriminated union or loose interface to accommodate Azure credentials.
