/**
 * @storage-kit/client
 *
 * Framework-agnostic TypeScript client SDK for Storage Kit.
 * Provides easy file upload, delete, and signed URL generation.
 */

export { createStorageClient } from "./src/client";
export { StorageClientError, type StorageClientErrorCode } from "./src/errors";
export type {
  BulkDeleteFailure,
  BulkDeleteParams,
  BulkDeleteResponse,
  DeleteParams,
  FetchOptions,
  FileInput,
  HealthResponse,
  Result,
  SignedUrlParams,
  SignedUrlResponse,
  StorageClient,
  StorageClientConfig,
  UploadParams,
  UploadResponse,
} from "./src/types";
