/**
 * Storage Handler - Framework-Agnostic Request Handler
 *
 * Contains all business logic for HTTP storage operations.
 * Framework adapters delegate to this class for consistent behavior.
 */

import {
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IStorageService,
  type SignedUrlOptions,
  type SignedUrlResponse,
  StorageError,
} from "../providers/storageService";
import type { StorageKitConfig, UploadedFile } from "./types";
import { MAX_BULK_DELETE_KEYS } from "./types";

/**
 * Signed URL type parameter values.
 */
export type SignedUrlType = "upload" | "download";

/**
 * Framework-agnostic handler for storage HTTP operations.
 *
 * This class contains all business logic and is used by framework adapters
 * to ensure consistent behavior across Express, Fastify, Hono, and NestJS.
 *
 * @example
 * ```typescript
 * const handler = new StorageHandler(storageService, config);
 *
 * // In your framework adapter
 * const result = await handler.handleUpload("my-bucket", file, "avatars/user123");
 * ```
 */
export class StorageHandler {
  constructor(
    private readonly storage: IStorageService,
    private readonly config: StorageKitConfig
  ) {}

  /**
   * Resolve the bucket name from URL parameter.
   * If the bucket is "_" (underscore placeholder), use the default bucket.
   *
   * @param bucket - Bucket name from URL parameter
   * @returns Resolved bucket name
   * @throws {StorageError} If no bucket can be resolved
   */
  resolveBucket(bucket: string): string {
    if (bucket === "_" && this.config.defaultBucket) {
      return this.config.defaultBucket;
    }
    if (bucket === "_" && !this.config.defaultBucket) {
      throw new StorageError(
        "MISSING_REQUIRED_PARAM",
        "Bucket parameter is '_' but no defaultBucket is configured",
        { parameter: "bucket" }
      );
    }
    return bucket;
  }

  /**
   * Handle file upload request.
   *
   * @param bucket - Bucket name from URL parameter
   * @param file - Uploaded file (normalized to UploadedFile interface)
   * @param path - Optional folder path prefix
   * @param contentType - Optional MIME type override
   * @returns File upload response with URL and key
   * @throws {StorageError} MISSING_FILE if no file provided
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket doesn't exist
   * @throws {StorageError} UPLOAD_FAILED if upload fails
   */
  async handleUpload(
    bucket: string,
    file: UploadedFile | undefined | null,
    path?: string,
    contentType?: string
  ): Promise<FileUploadResponse> {
    // Validate file is present
    if (!file) {
      throw new StorageError(
        "MISSING_FILE",
        "The request must contain a 'file' field",
        {}
      );
    }

    // Validate file size if configured
    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      throw new StorageError(
        "MISSING_FILE",
        `File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
        { size: file.size, maxSize: this.config.maxFileSize }
      );
    }

    // Validate MIME type if configured
    if (this.config.allowedMimeTypes && this.config.allowedMimeTypes.length > 0) {
      const isAllowed = this.config.allowedMimeTypes.some((pattern) => {
        if (pattern.endsWith("/*")) {
          const prefix = pattern.slice(0, -1); // Remove the "*"
          return file.mimeType.startsWith(prefix);
        }
        return file.mimeType === pattern;
      });

      if (!isAllowed) {
        throw new StorageError(
          "MISSING_FILE",
          `File type '${file.mimeType}' is not allowed`,
          { mimeType: file.mimeType, allowed: this.config.allowedMimeTypes }
        );
      }
    }

    const resolvedBucket = this.resolveBucket(bucket);

    // Upload the file
    const result = await this.storage
      .getBucket(resolvedBucket)
      .uploadFile(file.buffer, file.originalName, path, {
        contentType: contentType ?? file.mimeType,
      });

    // Call hook if configured
    if (this.config.onUploadComplete) {
      this.config.onUploadComplete({
        url: result.url,
        key: result.key,
        bucket: resolvedBucket,
      });
    }

    return result;
  }

  /**
   * Handle single file deletion request.
   *
   * @param bucket - Bucket name from URL parameter
   * @param filePath - File path (key) to delete
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket doesn't exist
   * @throws {StorageError} FILE_NOT_FOUND if file doesn't exist
   * @throws {StorageError} DELETE_FAILED if deletion fails
   */
  async handleDelete(bucket: string, filePath: string): Promise<void> {
    const resolvedBucket = this.resolveBucket(bucket);
    await this.storage.getBucket(resolvedBucket).deleteFile(filePath);
  }

  /**
   * Handle bulk file deletion request.
   *
   * @param bucket - Bucket name from URL parameter
   * @param keys - Array of file keys to delete
   * @returns Bulk delete response with deleted count and failures
   * @throws {StorageError} EMPTY_KEYS_ARRAY if keys array is empty
   * @throws {StorageError} KEYS_LIMIT_EXCEEDED if too many keys
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket doesn't exist
   */
  async handleBulkDelete(
    bucket: string,
    keys: string[] | undefined
  ): Promise<BulkDeleteResponse> {
    // Validate keys array
    if (!keys || !Array.isArray(keys)) {
      throw new StorageError(
        "MISSING_REQUIRED_PARAM",
        "The 'keys' field is required and must be an array",
        { parameter: "keys" }
      );
    }

    if (keys.length === 0) {
      throw new StorageError(
        "EMPTY_KEYS_ARRAY",
        "The 'keys' array must not be empty",
        {}
      );
    }

    if (keys.length > MAX_BULK_DELETE_KEYS) {
      throw new StorageError(
        "KEYS_LIMIT_EXCEEDED",
        `The 'keys' array must not exceed ${MAX_BULK_DELETE_KEYS} items`,
        { provided: keys.length, maximum: MAX_BULK_DELETE_KEYS }
      );
    }

    const resolvedBucket = this.resolveBucket(bucket);
    return await this.storage.getBucket(resolvedBucket).deleteFiles(keys);
  }

  /**
   * Handle signed URL generation request.
   *
   * @param bucket - Bucket name from URL parameter
   * @param key - File key (path) for the signed URL
   * @param type - URL type: "upload" or "download"
   * @param options - Optional signed URL options
   * @returns Signed URL response
   * @throws {StorageError} MISSING_REQUIRED_PARAM if key or type is missing
   * @throws {StorageError} INVALID_SIGNED_URL_TYPE if type is invalid
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket doesn't exist
   * @throws {StorageError} SIGNED_URL_FAILED if generation fails
   */
  async handleSignedUrl(
    bucket: string,
    key: string | undefined,
    type: string | undefined,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse> {
    // Validate required parameters
    if (!key) {
      throw new StorageError(
        "MISSING_REQUIRED_PARAM",
        "The 'key' query parameter is required",
        { parameter: "key" }
      );
    }

    if (!type) {
      throw new StorageError(
        "MISSING_REQUIRED_PARAM",
        "The 'type' query parameter is required",
        { parameter: "type" }
      );
    }

    // Validate type parameter
    if (type !== "upload" && type !== "download") {
      throw new StorageError(
        "INVALID_SIGNED_URL_TYPE",
        "The 'type' parameter must be 'upload' or 'download'",
        { provided: type, allowed: ["upload", "download"] }
      );
    }

    const resolvedBucket = this.resolveBucket(bucket);
    const storageWithBucket = this.storage.getBucket(resolvedBucket);

    if (type === "upload") {
      return await storageWithBucket.getPresignedUploadUrl(key, options);
    } else {
      return await storageWithBucket.getPresignedDownloadUrl(key, {
        expiresIn: options?.expiresIn,
      });
    }
  }

  /**
   * Handle health check request.
   *
   * @returns Health check response
   */
  async handleHealthCheck(): Promise<HealthCheckResponse> {
    return await this.storage.healthCheck();
  }
}
