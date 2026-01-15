/**
 * Storage Kit - A unified storage service for S3-compatible providers
 *
 * @packageDocumentation
 */

// Core types and interface
export {
  StorageError,
  type BulkDeleteFailure,
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IStorageService,
  type SignedUrlOptions,
  type SignedUrlResponse,
  type StorageConfig,
  type StorageErrorCode,
  type UploadOptions,
} from "./providers/storageService";

// Provider implementations
export { BackBlazeStorageService } from "./providers/backblazeStorageService";
export { CloudflareR2StorageService } from "./providers/cloudflareR2StorageService";
export { MinioStorageService } from "./providers/minioStorageService";

// Handler abstraction for framework adapters
export {
  // Unified Storage Kit Instance
  BaseStorageKit,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_SIGNED_URL_EXPIRATION,
  MAX_BULK_DELETE_KEYS,
  StorageHandler,
  isStorageError,
  mapAnyErrorToResponse,
  mapErrorToResponse,
  type BaseStorageKitConfig,
  type HttpErrorResponse,
  type IStorageKitService,
  type SignedUrlType,
  type StorageKitConfig,
  type StorageKitInstanceConfig,
  type StorageProvider,
  type UploadedFile,
} from "./handler";

/**
 * Factory function to create a storage service based on provider type.
 *
 * @param provider - The provider type ('minio', 'backblaze', 'cloudflare-r2')
 * @param config - Optional configuration for the provider
 * @returns A storage service instance
 *
 * @example
 * ```typescript
 * import { createStorageService } from '@storage-kit/core';
 *
 * const storage = createStorageService('minio', {
 *   endpoint: 'http://localhost:9000',
 *   accessKeyId: 'minioadmin',
 *   secretAccessKey: 'minioadmin',
 * });
 *
 * const result = await storage
 *   .getBucket('my-bucket')
 *   .uploadFile(buffer, 'image.png');
 * ```
 */
export function createStorageService(
  provider: "minio" | "backblaze" | "cloudflare-r2",
  config?: Partial<import("./providers/storageService").StorageConfig>
): import("./providers/storageService").IStorageService {
  switch (provider) {
    case "minio":
      return new (require("./providers/minioStorageService").MinioStorageService)(
        config
      );
    case "backblaze":
      return new (require("./providers/backblazeStorageService").BackBlazeStorageService)(
        config
      );
    case "cloudflare-r2":
      return new (require("./providers/cloudflareR2StorageService").CloudflareR2StorageService)(
        config
      );
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
