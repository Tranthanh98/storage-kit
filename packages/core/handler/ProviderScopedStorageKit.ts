/**
 * Provider-Scoped Storage Kit
 *
 * A wrapper that provides storage operations scoped to a specific provider.
 * Returned by `useProvider()` method on BaseStorageKit.
 */

import {
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IStorageService,
  type SignedUrlOptions,
  type SignedUrlResponse,
  type UploadOptions,
  StorageError,
} from "../providers/storageService";
import type { IProviderScopedStorageKit } from "./StorageKitInstance";

/**
 * Configuration shared with the parent StorageKit.
 */
export interface ProviderScopedConfig {
  /** Default bucket name when using underscore placeholder */
  defaultBucket?: string;
  /** Callback fired after successful upload */
  onUploadComplete?: (result: {
    url: string;
    key: string;
    bucket: string;
  }) => void;
}

/**
 * Provider-scoped storage kit implementation.
 *
 * This class wraps a specific IStorageService and provides the same
 * API as BaseStorageKit but scoped to a single provider.
 *
 * @internal
 */
export class ProviderScopedStorageKit implements IProviderScopedStorageKit {
  private readonly _storage: IStorageService;
  private readonly _config: ProviderScopedConfig;

  constructor(storage: IStorageService, config: ProviderScopedConfig) {
    this._storage = storage;
    this._config = config;
  }

  /**
   * Get the underlying storage service.
   */
  get storage(): IStorageService {
    return this._storage;
  }

  /**
   * Resolve the bucket name from parameter.
   * If the bucket is "_" (underscore placeholder), use the default bucket.
   */
  private resolveBucket(bucket: string): string {
    if (bucket === "_" && this._config.defaultBucket) {
      return this._config.defaultBucket;
    }
    if (bucket === "_" && !this._config.defaultBucket) {
      throw new StorageError(
        "MISSING_REQUIRED_PARAM",
        "Bucket parameter is '_' but no defaultBucket is configured",
        { parameter: "bucket" }
      );
    }
    return bucket;
  }

  /**
   * Upload a file to storage.
   */
  async uploadFile(
    bucket: string,
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    const result = await this._storage
      .getBucket(resolvedBucket)
      .uploadFile(file, fileName, pathFolder, options);

    // Call hook if configured
    if (this._config.onUploadComplete) {
      this._config.onUploadComplete({
        url: result.url,
        key: result.key,
        bucket: resolvedBucket,
      });
    }

    return result;
  }

  /**
   * Delete a single file from storage.
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    const resolvedBucket = this.resolveBucket(bucket);
    await this._storage.getBucket(resolvedBucket).deleteFile(key);
  }

  /**
   * Delete multiple files from storage.
   */
  async deleteFiles(
    bucket: string,
    keys: string[]
  ): Promise<BulkDeleteResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    return await this._storage.getBucket(resolvedBucket).deleteFiles(keys);
  }

  /**
   * Generate a presigned URL for file upload.
   */
  async getPresignedUploadUrl(
    bucket: string,
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    return await this._storage
      .getBucket(resolvedBucket)
      .getPresignedUploadUrl(key, options);
  }

  /**
   * Generate a presigned URL for file download.
   */
  async getPresignedDownloadUrl(
    bucket: string,
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    return await this._storage
      .getBucket(resolvedBucket)
      .getPresignedDownloadUrl(key, options);
  }

  /**
   * Check the health of the storage provider.
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return await this._storage.healthCheck();
  }

  /**
   * Get a bucket-scoped service for simpler API.
   */
  bucket(bucketName: string): IStorageService {
    const resolvedBucket = this.resolveBucket(bucketName);
    return this._storage.getBucket(resolvedBucket);
  }
}
