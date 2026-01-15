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
import type { StorageProvider } from "./types";

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
 * Interface for provider-scoped storage kit operations.
 * Returned by `useProvider()` method for operations against a specific provider.
 */
export interface IProviderScopedStorageKit {
  /**
   * Get the underlying storage service for advanced operations.
   */
  readonly storage: IStorageService;

  /**
   * Upload a file to storage using this provider.
   */
  uploadFile(
    bucket: string,
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse>;

  /**
   * Delete a single file from storage using this provider.
   */
  deleteFile(bucket: string, key: string): Promise<void>;

  /**
   * Delete multiple files from storage using this provider.
   */
  deleteFiles(bucket: string, keys: string[]): Promise<BulkDeleteResponse>;

  /**
   * Generate a presigned URL for file upload using this provider.
   */
  getPresignedUploadUrl(
    bucket: string,
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse>;

  /**
   * Generate a presigned URL for file download using this provider.
   */
  getPresignedDownloadUrl(
    bucket: string,
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse>;

  /**
   * Check the health of this provider.
   */
  healthCheck(): Promise<HealthCheckResponse>;

  /**
   * Get a bucket-scoped service for simpler API using this provider.
   */
  bucket(bucketName: string): IStorageService;
}

/**
 * Service interface for programmatic storage operations.
 *
 * This interface provides direct access to storage operations without HTTP.
 * Use this when you need to perform storage operations from your application code.
 */
export interface IStorageKitService extends IProviderScopedStorageKit {
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
   * // Configure with multiple providers
   * const storeKit = createStorageKit({
   *   provider: "minio",
   *   providers: {
   *     minio: { endpoint: "...", accessKeyId: "...", secretAccessKey: "..." },
   *     "cloudflare-r2": { endpoint: "...", accessKeyId: "...", secretAccessKey: "..." },
   *   },
   * });
   *
   * // Use default provider (minio)
   * await storeKit.bucket("images").deleteFile("old.png");
   *
   * // Switch to R2 for specific operation
   * await storeKit.useProvider("cloudflare-r2").bucket("images").deleteFile("new.png");
   * ```
   */
  useProvider(providerType: StorageProvider): IProviderScopedStorageKit;
}
