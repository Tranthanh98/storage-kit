/**
 * Storage Kit Client Types
 *
 * Type definitions for the client SDK.
 */

import type { StorageClientError } from "./errors";

/**
 * Configuration options for the Storage Kit client.
 */
export interface StorageClientConfig {
  /** Base URL of Storage Kit server (e.g., "http://localhost:3000/storage") */
  baseURL: string;
  /** Default bucket name (used when bucket="_") */
  defaultBucket?: string;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
  /** Default headers for all requests */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * File input type - supports browser File, Blob, or buffer-based input.
 */
export type FileInput =
  | File
  | Blob
  | {
      /** File content as Buffer or Uint8Array */
      buffer: Buffer | Uint8Array;
      /** Filename */
      name: string;
      /** MIME type */
      type: string;
    };

/**
 * Parameters for file upload.
 */
export interface UploadParams {
  /** Target bucket name (use "_" for default bucket) */
  bucket: string;
  /** File to upload */
  file: FileInput;
  /** Optional folder path prefix */
  path?: string;
  /** Optional MIME type override */
  contentType?: string;
}

/**
 * Parameters for single file deletion.
 */
export interface DeleteParams {
  /** Target bucket name */
  bucket: string;
  /** File key (path) to delete */
  key: string;
}

/**
 * Parameters for bulk file deletion.
 */
export interface BulkDeleteParams {
  /** Target bucket name */
  bucket: string;
  /** Array of file keys to delete (max 1000) */
  keys: string[];
}

/**
 * Parameters for signed URL generation.
 */
export interface SignedUrlParams {
  /** Target bucket name */
  bucket: string;
  /** File key (path) for the signed URL */
  key: string;
  /** URL type: "upload" for PUT, "download" for GET */
  type: "upload" | "download";
  /** Optional expiration time in seconds (default: 3600) */
  expiresIn?: number;
  /** Optional content type (for upload URLs) */
  contentType?: string;
}

/**
 * Response from file upload.
 */
export interface UploadResponse {
  /** The public URL of the uploaded file */
  url: string;
  /** The storage key (path) of the uploaded file */
  key: string;
}

/**
 * Failure detail in bulk delete response.
 */
export interface BulkDeleteFailure {
  /** The file key that failed to delete */
  key: string;
  /** Error code explaining the failure */
  reason: string;
}

/**
 * Response from bulk delete operation.
 */
export interface BulkDeleteResponse {
  /** Number of successfully deleted files */
  deleted: number;
  /** Array of files that failed to delete */
  failed: BulkDeleteFailure[];
}

/**
 * Response from signed URL generation.
 */
export interface SignedUrlResponse {
  /** The presigned URL for upload or download */
  signedUrl: string;
  /** The eventual public URL of the file (only for upload type) */
  publicUrl?: string;
  /** When the presigned URL expires */
  expiresAt: string;
}

/**
 * Response from health check.
 */
export interface HealthResponse {
  /** Health status */
  status: "healthy" | "unhealthy";
  /** Provider name (when healthy) */
  provider?: string;
  /** Error message (when unhealthy) */
  error?: string;
}

/**
 * Result type for all client methods.
 * Either contains data on success or error on failure.
 */
export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: StorageClientError };

/**
 * Fetch options that can be passed to individual method calls.
 */
export interface FetchOptions {
  /** Additional headers for this request */
  headers?: Record<string, string>;
  /** Request timeout override in milliseconds */
  timeout?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Storage client interface with all available methods.
 */
export interface StorageClient {
  /** Upload a file to storage */
  upload(
    params: UploadParams,
    options?: FetchOptions
  ): Promise<Result<UploadResponse>>;

  /** Delete a single file from storage */
  delete(params: DeleteParams, options?: FetchOptions): Promise<Result<void>>;

  /** Delete multiple files from storage */
  bulkDelete(
    params: BulkDeleteParams,
    options?: FetchOptions
  ): Promise<Result<BulkDeleteResponse>>;

  /** Generate a presigned URL for upload or download */
  getSignedUrl(
    params: SignedUrlParams,
    options?: FetchOptions
  ): Promise<Result<SignedUrlResponse>>;

  /** Check storage provider health */
  health(options?: FetchOptions): Promise<Result<HealthResponse>>;
}
