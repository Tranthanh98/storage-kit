# Tasks: Define Storage Kit HTTP API

## 1. OpenAPI Specification

- [x] 1.1 Create `openapi/storage-api.yaml` with OpenAPI 3.0.3 structure
- [x] 1.2 Define component schemas (FileUploadResponse, SignedUrlResponse, ErrorResponse, etc.)
- [x] 1.3 Define `POST /storage/{bucket}/files` upload endpoint
- [x] 1.4 Define `DELETE /storage/{bucket}/files/{filePath}` single delete endpoint
- [x] 1.5 Define `DELETE /storage/{bucket}/files` bulk delete endpoint
- [x] 1.6 Define `GET /storage/{bucket}/signed-url` presigned URL endpoint
- [x] 1.7 Define `GET /storage/health` optional health check endpoint
- [x] 1.8 Validate OpenAPI spec with linter (e.g., spectral or swagger-cli)

## 2. Interface Alignment

- [x] 2.1 Review `IStorageService` interface against OpenAPI spec
- [x] 2.2 Add `getPresignedDownloadUrl()` method if missing (for download signed URLs)
- [x] 2.3 Standardize error types across providers
- [x] 2.4 Remove application-specific code (LOOPIE\_\* constants, appConfig references)

## 3. Provider Implementation Review

- [x] 3.1 Review MinioStorageService for spec compliance
- [x] 3.2 Review BackBlazeStorageService for spec compliance
- [x] 3.3 Review CloudflareR2StorageService for spec compliance
- [x] 3.4 Fix inconsistent error handling across providers
- [x] 3.5 Remove debug `console.log` statements

## 4. Package Setup

- [x] 4.1 Update package.json with proper metadata (description, keywords, repository)
- [x] 4.2 Add TypeScript configuration if missing
- [x] 4.3 Create index.ts barrel export
- [x] 4.4 Add npm scripts for build, lint, test

## 5. Documentation

- [x] 5.1 Create README with usage examples
- [x] 5.2 Document environment variables for each provider
- [x] 5.3 Add inline JSDoc comments to exported types
