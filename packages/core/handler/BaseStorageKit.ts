/**
 * Base Storage Kit Implementation
 *
 * Provides framework-agnostic implementation of IStorageKitService.
 * Framework adapters extend this to add their specific route handler.
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
import type { IStorageKitService } from "./StorageKitInstance";
import type { StorageKitConfig } from "./types";

/**
 * Extended config that includes provider configuration.
 */
export interface BaseStorageKitConfig extends StorageKitConfig {
  /** Custom storage service instance (overrides provider config) */
  storage?: IStorageService;
}

/**
 * Factory function type for creating storage service.
 */
function internalCreateStorageService(
  provider: "minio" | "backblaze" | "cloudflare-r2",
  config?: Partial<import("../providers/storageService").StorageConfig>
): IStorageService {
  switch (provider) {
    case "minio":
      return new (require("../providers/minioStorageService").MinioStorageService)(
        config
      );
    case "backblaze":
      return new (require("../providers/backblazeStorageService").BackBlazeStorageService)(
        config
      );
    case "cloudflare-r2":
      return new (require("../providers/cloudflareR2StorageService").CloudflareR2StorageService)(
        config
      );
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

/**
 * Base Storage Kit class that provides service functionality.
 *
 * Framework-specific adapters extend this class and implement the routeHandler.
 *
 * @example
 * ```typescript
 * // In your application
 * const kit = new ExpressStorageKit({
 *   provider: "minio",
 *   endpoint: "http://localhost:9000",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 *   defaultBucket: "my-bucket",
 * });
 *
 * // Use as route handler
 * app.use("/api/storage", kit.routeHandler());
 *
 * // Use as service
 * const result = await kit.uploadFile("my-bucket", buffer, "image.png");
 * ```
 */
export class BaseStorageKit implements IStorageKitService {
  protected readonly _storage: IStorageService;
  protected readonly _config: BaseStorageKitConfig;

  constructor(config: BaseStorageKitConfig) {
    this._config = config;

    // Create storage service from config or use provided instance
    this._storage =
      config.storage ??
      internalCreateStorageService(config.provider, {
        endpoint: config.endpoint,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        publicUrlBase: config.publicUrlBase,
      });
  }

  /**
   * Get the underlying storage service.
   */
  get storage(): IStorageService {
    return this._storage;
  }

  /**
   * Get the configuration.
   */
  get config(): BaseStorageKitConfig {
    return this._config;
  }

  /**
   * Resolve the bucket name from parameter.
   * If the bucket is "_" (underscore placeholder), use the default bucket.
   */
  protected resolveBucket(bucket: string): string {
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
