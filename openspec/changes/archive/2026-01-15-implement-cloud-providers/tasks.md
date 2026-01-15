## 1. Core Implementation
- [x] 1.1 Refactor `StorageConfig` types in `packages/core/providers/storageService.ts` to support S3 and Azure variants.
- [x] 1.2 Implement `AmazonS3StorageService` in `packages/core/providers/amazonS3StorageService.ts`.
- [x] 1.3 Implement `GoogleCloudStorageService` in `packages/core/providers/googleCloudStorageService.ts` (using S3 interop).
- [x] 1.4 Implement `DigitalOceanSpacesService` in `packages/core/providers/digitalOceanSpacesService.ts`.
- [x] 1.5 Install `@azure/storage-blob` dependency in `packages/core`.
- [x] 1.6 Implement `AzureBlobStorageService` in `packages/core/providers/azureBlobStorageService.ts`.
- [x] 1.7 Export new services in `packages/core/index.ts`.

## 2. Verification
- [x] 2.1 Add unit tests for `AmazonS3StorageService`.
- [x] 2.2 Add unit tests for `GoogleCloudStorageService`.
- [x] 2.3 Add unit tests for `DigitalOceanSpacesService`.
- [x] 2.4 Add unit tests for `AzureBlobStorageService`.
- [x] 2.5 Verify build passes with `npm run build`.
