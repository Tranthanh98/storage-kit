/**
 * Storage Kit Instance - Unified API for both route handling and service usage
 *
 * This module provides a unified instance that can be used both as:
 * 1. A route handler for HTTP endpoints
 * 2. A service for programmatic access to storage operations
 */

import {
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IStorageService,
  type SignedUrlOptions,
  type SignedUrlResponse,
  type UploadOptions,
} from "../providers/storageService";

/**
 * Options for the Storage Kit instance.
 */
export interface StorageKitInstanceConfig {
  /** Default bucket name for service operations */
  defaultBucket?: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Allowed MIME types (e.g., ["image/*", "application/pdf"]) */
  allowedMimeTypes?: string[];
  /** Callback fired after successful upload */
  onUploadComplete?: (result: {
    url: string;
    key: string;
    bucket: string;
  }) => void;
  /** Callback fired when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Service interface for programmatic storage operations.
 *
 * This interface provides direct access to storage operations without HTTP.
 * Use this when you need to perform storage operations from your application code.
 */
export interface IStorageKitService {
  /**
   * Get the underlying storage service for advanced operations.
   */
  readonly storage: IStorageService;

  /**
   * Upload a file to storage.
   *
   * @param bucket - Bucket name (use "_" to use defaultBucket)
   * @param file - File content as Buffer or Uint8Array
   * @param fileName - Name of the file
   * @param pathFolder - Optional folder path prefix
   * @param options - Upload options (contentType, upsert)
   * @returns Promise resolving to upload response with URL and key
   *
   * @example
   * ```typescript
   * const result = await storeKit.uploadFile(
   *   "my-bucket",
   *   buffer,
   *   "avatar.png",
   *   "users/123",
   *   { contentType: "image/png" }
   * );
   * console.log(result.url); // Public URL of the uploaded file
   * ```
   */
  uploadFile(
    bucket: string,
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse>;

  /**
   * Delete a single file from storage.
   *
   * @param bucket - Bucket name (use "_" to use defaultBucket)
   * @param key - The file key (path) to delete
   *
   * @example
   * ```typescript
   * await storeKit.deleteFile("my-bucket", "users/123/avatar.png");
   * ```
   */
  deleteFile(bucket: string, key: string): Promise<void>;

  /**
   * Delete multiple files from storage.
   *
   * @param bucket - Bucket name (use "_" to use defaultBucket)
   * @param keys - Array of file keys to delete (max 1000)
   * @returns Promise resolving to bulk delete response
   *
   * @example
   * ```typescript
   * const result = await storeKit.deleteFiles("my-bucket", [
   *   "users/123/avatar.png",
   *   "users/123/cover.jpg"
   * ]);
   * console.log(`Deleted ${result.deleted} files`);
   * ```
   */
  deleteFiles(bucket: string, keys: string[]): Promise<BulkDeleteResponse>;

  /**
   * Generate a presigned URL for file upload.
   *
   * @param bucket - Bucket name (use "_" to use defaultBucket)
   * @param key - The file key (path) for the upload
   * @param options - Signed URL options (contentType, expiresIn)
   * @returns Promise resolving to signed URL response
   *
   * @example
   * ```typescript
   * const result = await storeKit.getPresignedUploadUrl(
   *   "my-bucket",
   *   "users/123/avatar.png",
   *   { contentType: "image/png", expiresIn: 3600 }
   * );
   * // Client can PUT to result.signedUrl
   * ```
   */
  getPresignedUploadUrl(
    bucket: string,
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse>;

  /**
   * Generate a presigned URL for file download.
   *
   * @param bucket - Bucket name (use "_" to use defaultBucket)
   * @param key - The file key (path) for the download
   * @param options - Signed URL options (expiresIn)
   * @returns Promise resolving to signed URL response
   *
   * @example
   * ```typescript
   * const result = await storeKit.getPresignedDownloadUrl(
   *   "my-bucket",
   *   "users/123/avatar.png",
   *   { expiresIn: 3600 }
   * );
   * // Client can GET from result.signedUrl
   * ```
   */
  getPresignedDownloadUrl(
    bucket: string,
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse>;

  /**
   * Check the health of the storage provider.
   *
   * @returns Promise resolving to health check response
   *
   * @example
   * ```typescript
   * const health = await storeKit.healthCheck();
   * if (health.status === "healthy") {
   *   console.log(`Connected to ${health.provider}`);
   * }
   * ```
   */
  healthCheck(): Promise<HealthCheckResponse>;

  /**
   * Get a bucket-scoped service for simpler API.
   *
   * @param bucketName - The bucket to scope to
   * @returns A bucket-scoped storage service
   *
   * @example
   * ```typescript
   * const avatarBucket = storeKit.bucket("avatars");
   * const result = await avatarBucket.uploadFile(buffer, "user123.png");
   * ```
   */
  bucket(bucketName: string): IStorageService;
}
