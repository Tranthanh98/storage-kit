/**
 * Base Storage Kit Implementation
 *
 * Provides framework-agnostic implementation of IStorageKitService.
 * Framework adapters extend this to add their specific route handler.
 *
 * Supports both single-provider (backward compatible) and multi-provider modes.
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
import type {
  IProviderScopedStorageKit,
  IStorageKitService,
} from "./StorageKitInstance";
import { ProviderRegistry } from "./ProviderRegistry";
import { ProviderScopedStorageKit } from "./ProviderScopedStorageKit";
import {
  type StorageKitConfig,
  type StorageProvider,
  isMultiProviderConfig,
} from "./types";

/**
 * Extended config that includes provider configuration.
 */
export type BaseStorageKitConfig = StorageKitConfig & {
  /** Custom storage service instance (overrides provider config) */
  storage?: IStorageService;
};

/**
 * Factory function type for creating storage service.
 */
function internalCreateStorageService(
  provider: StorageProvider,
  config?: any
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
    case "s3":
      return new (require("../providers/amazonS3StorageService").AmazonS3StorageService)(
        config
      );
    case "gcs":
      return new (require("../providers/googleCloudStorageService").GoogleCloudStorageService)(
        config
      );
    case "spaces":
      return new (require("../providers/digitalOceanSpacesService").DigitalOceanSpacesService)(
        config
      );
    case "azure":
      return new (require("../providers/azureBlobStorageService").AzureBlobStorageService)(
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
 * Supports both single-provider and multi-provider configurations:
 *
 * @example Single-provider (backward compatible)
 * ```typescript
 * const kit = new ExpressStorageKit({
 *   provider: "minio",
 *   endpoint: "http://localhost:9000",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 *   defaultBucket: "my-bucket",
 * });
 *
 * app.use("/api/storage", kit.routeHandler());
 * const result = await kit.uploadFile("my-bucket", buffer, "image.png");
 * ```
 *
 * @example Multi-provider
 * ```typescript
 * const kit = createStorageKit({
 *   provider: "minio", // default provider
 *   providers: {
 *     minio: { endpoint: "...", accessKeyId: "...", secretAccessKey: "..." },
 *     "cloudflare-r2": { endpoint: "...", accessKeyId: "...", secretAccessKey: "..." },
 *   },
 *   defaultBucket: "my-bucket",
 * });
 *
 * // Use default provider
 * await kit.bucket("images").deleteFile("old.png");
 *
 * // Switch to R2 for specific operation
 * await kit.useProvider("cloudflare-r2").bucket("images").deleteFile("new.png");
 * ```
 */
export class BaseStorageKit implements IStorageKitService {
  protected readonly _storage: IStorageService;
  protected readonly _config: BaseStorageKitConfig;
  protected readonly _registry: ProviderRegistry | null;
  protected readonly _defaultProviderName: StorageProvider;

  constructor(config: BaseStorageKitConfig) {
    this._config = config;

    if (isMultiProviderConfig(config)) {
      // Multi-provider mode
      const defaultProvider = config.provider;

      // Validate that default provider exists in providers map
      if (!config.providers[defaultProvider]) {
        const availableProviders = Object.keys(config.providers);
        throw new StorageError(
          "PROVIDER_NOT_CONFIGURED",
          `Default provider "${defaultProvider}" is not configured in providers map. Available providers: ${
            availableProviders.length > 0
              ? availableProviders.join(", ")
              : "(none)"
          }`,
          { requestedProvider: defaultProvider, availableProviders }
        );
      }

      // Create provider registry with all configured providers
      this._registry = new ProviderRegistry(config.providers);
      this._storage =
        config.storage ?? this._registry.get(defaultProvider);
      this._defaultProviderName = defaultProvider;
    } else {
      // Single-provider mode (backward compatible)
      this._registry = null;
      this._storage =
        config.storage ??
        internalCreateStorageService(config.provider, config);
      this._defaultProviderName = config.provider;
    }
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
   * Switch to a specific provider for subsequent operations.
   * Returns a provider-scoped storage kit that uses the specified provider.
   *
   * @param providerType - The provider type (must be configured in `providers` map)
   * @returns A provider-scoped storage kit instance
   * @throws {StorageError} PROVIDER_NOT_CONFIGURED if provider is not configured
   *
   * @example
   * ```typescript
   * // Switch to R2 for specific operation
   * await storeKit.useProvider("cloudflare-r2").bucket("images").deleteFile("photo.jpg");
   * ```
   */
  useProvider(providerType: StorageProvider): IProviderScopedStorageKit {
    if (!this._registry) {
      // Single-provider mode - check if requesting the only available provider
      if (providerType === this._defaultProviderName) {
        return new ProviderScopedStorageKit(this._storage, {
          defaultBucket: this._config.defaultBucket,
          onUploadComplete: this._config.onUploadComplete,
        });
      }

      throw new StorageError(
        "PROVIDER_NOT_CONFIGURED",
        `Provider "${providerType}" is not configured. Multi-provider mode is not enabled. ` +
          `Only the default provider "${this._defaultProviderName}" is available. ` +
          `To use multiple providers, configure with a "providers" map.`,
        {
          requestedProvider: providerType,
          availableProviders: [this._defaultProviderName],
          multiProviderEnabled: false,
        }
      );
    }

    // Multi-provider mode - get from registry
    const storage = this._registry.get(providerType);
    return new ProviderScopedStorageKit(storage, {
      defaultBucket: this._config.defaultBucket,
      onUploadComplete: this._config.onUploadComplete,
    });
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
