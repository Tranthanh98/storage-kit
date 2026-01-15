# Tasks: Add Client SDK Package

## 1. Package Setup

- [x] 1.1 Create `packages/client/` directory structure
- [x] 1.2 Create `package.json` with name `@storage-kit/client`, version `1.0.0`
- [x] 1.3 Create `tsconfig.json` extending base config
- [x] 1.4 Create `tsup.config.ts` for bundling (ESM + CJS)
- [x] 1.5 Add `packages/client` to workspace in `pnpm-workspace.yaml`

## 2. Core Types

- [x] 2.1 Create `src/types.ts` with:
  - `StorageClientConfig` interface
  - `UploadParams`, `DeleteParams`, `BulkDeleteParams`, `SignedUrlParams` interfaces
  - `UploadResponse`, `BulkDeleteResponse`, `SignedUrlResponse`, `HealthResponse` interfaces
  - `Result<T>` type (`{ data: T; error: null } | { data: null; error: StorageClientError }`)
- [x] 2.2 Create `src/errors.ts` with `StorageClientError` class

## 3. Client Implementation

- [x] 3.1 Create `src/utils.ts` with:
  - `buildUrl()` - URL construction with query params
  - `createFormData()` - FormData construction from File/Buffer
  - `normalizeError()` - Convert fetch errors to StorageClientError
- [x] 3.2 Create `src/client.ts` with `createStorageClient()` factory:
  - Accept `StorageClientConfig`
  - Return object with `upload`, `delete`, `bulkDelete`, `getSignedUrl`, `health` methods
- [x] 3.3 Implement `upload()` method with multipart/form-data POST
- [x] 3.4 Implement `delete()` method with DELETE request
- [x] 3.5 Implement `bulkDelete()` method with DELETE + JSON body
- [x] 3.6 Implement `getSignedUrl()` method with GET + query params
- [x] 3.7 Implement `health()` method with GET request

## 4. Exports

- [x] 4.1 Create `src/index.ts` exporting:
  - `createStorageClient` function
  - All types from `types.ts`
  - `StorageClientError` class

## 5. Testing

- [x] 5.1 Create `__tests__/client.test.ts` with unit tests:
  - Client factory creates valid instance
  - Each method makes correct HTTP request
  - Error handling works correctly
- [x] 5.2 Create mock fetch for testing without real server
- [x] 5.3 Add test script to `package.json`

## 6. Documentation

- [x] 6.1 Create `packages/client/README.md` with:
  - Installation instructions
  - Quick start example
  - API reference for all methods
  - Configuration options
  - Error handling guide
- [x] 6.2 Update root README.md to mention client SDK package

## 7. Build & Validate

- [x] 7.1 Run `pnpm build` in client package
- [x] 7.2 Run `pnpm typecheck` to verify TypeScript
- [x] 7.3 Run `pnpm test` to verify all tests pass
- [x] 7.4 Test import in example project to verify exports work

## Dependencies

- Tasks 2.x and 3.x can be worked on in parallel after 1.x is complete
- Task 4.1 depends on 2.x and 3.x completion
- Task 5.x can start after 3.x is complete
- Task 6.x can start after 4.1 is complete
- Task 7.x requires all previous tasks to be complete
