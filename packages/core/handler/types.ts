/**
 * Storage Kit Handler Types
 *
 * Common types for HTTP handler abstraction used by framework adapters.
 */

import type { StorageErrorCode } from "../providers/storageService";

/**
 * Provider type supported by Storage Kit.
 */
export type StorageProvider =
  | "minio"
  | "backblaze"
  | "cloudflare-r2"
  | "s3"
  | "gcs"
  | "spaces"
  | "azure";

/**
 * Normalized file input from multipart form data.
 * Adapters must convert their framework-specific file objects to this interface.
 */
export interface UploadedFile {
  /** File content as Buffer or Uint8Array */
  buffer: Buffer | Uint8Array;
  /** Original filename from the upload */
  originalName: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Configuration options for Storage Kit adapters.
 */
export interface BaseStorageKitConfig {
  // Provider selection (required)
  /** Storage provider type */
  provider: StorageProvider;
  
  // Adapter options
  /** Default bucket name when using underscore placeholder */
  defaultBucket?: string;
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Allowed MIME types (e.g., ["image/*", "application/pdf"]) */
  allowedMimeTypes?: string[];

  // Hooks for customization
  /** Callback fired after successful upload */
  onUploadComplete?: (result: {
    url: string;
    key: string;
    bucket: string;
  }) => void;
  /** Callback fired when an error occurs */
  onError?: (error: Error) => void;
  
  /** Public URL base for generating file URLs */
  publicUrlBase?: string;
}

export interface S3KitConfig extends BaseStorageKitConfig {
  provider: "minio" | "backblaze" | "cloudflare-r2" | "s3" | "gcs" | "spaces";
  /** S3-compatible endpoint URL */
  endpoint?: string;
  /** Access key ID for authentication */
  accessKeyId?: string;
  /** Secret access key for authentication */
  secretAccessKey?: string;
  /** AWS region (use 'auto' for R2, 'us-east-1' for MinIO) */
  region?: string;
}

export interface AzureKitConfig extends BaseStorageKitConfig {
  provider: "azure";
  /** Azure connection string */
  connectionString?: string;
  /** Azure storage account name */
  accountName?: string;
  /** Azure storage account key */
  accountKey?: string;
}

/**
 * Single-provider configuration (backward compatible).
 */
export type SingleProviderStorageKitConfig = S3KitConfig | AzureKitConfig;

/**
 * Provider-specific configuration for S3-compatible services.
 * Used in multi-provider mode - the provider type is determined by the key.
 */
export interface S3ProviderConfig {
  /** S3-compatible endpoint URL */
  endpoint?: string;
  /** Access key ID for authentication */
  accessKeyId?: string;
  /** Secret access key for authentication */
  secretAccessKey?: string;
  /** AWS region (use 'auto' for R2, 'us-east-1' for MinIO) */
  region?: string;
  /** Public URL base for generating file URLs */
  publicUrlBase?: string;
}

/**
 * Azure provider configuration for multi-provider mode.
 * Used in multi-provider mode - the provider type is determined by the key.
 */
export interface AzureProviderConfig {
  /** Azure connection string */
  connectionString?: string;
  /** Azure storage account name */
  accountName?: string;
  /** Azure storage account key */
  accountKey?: string;
  /** Public URL base for generating file URLs */
  publicUrlBase?: string;
}

/**
 * S3-compatible provider types.
 */
export type S3Provider = "minio" | "backblaze" | "cloudflare-r2" | "s3" | "gcs" | "spaces";

/**
 * Map of S3-compatible provider names to their configurations.
 */
export type S3ProvidersMap = {
  [K in S3Provider]?: S3ProviderConfig;
};

/**
 * Map of Azure provider to its configuration.
 */
export type AzureProvidersMap = {
  azure?: AzureProviderConfig;
};

/**
 * Map of provider names to their configurations.
 * Keys must be valid StorageProvider types.
 */
export type ProvidersMap = S3ProvidersMap & AzureProvidersMap;

/**
 * Multi-provider configuration options.
 * Allows configuring multiple storage providers with a default.
 */
export interface MultiProviderStorageKitConfig {
  /** Default provider key (must exist in providers map) */
  provider: StorageProvider;
  /** Map of provider names to their configurations */
  providers: ProvidersMap;
  /** Default bucket name when using underscore placeholder */
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
  /** Public URL base for generating file URLs (used as fallback) */
  publicUrlBase?: string;
}

/**
 * Union of single-provider and multi-provider configurations.
 */
export type StorageKitConfig = SingleProviderStorageKitConfig | MultiProviderStorageKitConfig;

/**
 * Type guard to check if config is multi-provider mode.
 */
export function isMultiProviderConfig(
  config: StorageKitConfig
): config is MultiProviderStorageKitConfig {
  return "providers" in config && typeof config.providers === "object";
}

/**
 * HTTP response structure for errors.
 */
export interface HttpErrorResponse {
  /** HTTP status code */
  status: number;
  /** Response body matching OpenAPI error schema */
  body: {
    error: {
      code: StorageErrorCode;
      message: string;
      details: Record<string, unknown>;
    };
  };
}

/**
 * Default maximum file size (10MB).
 */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Default expiration for signed URLs (1 hour).
 */
export const DEFAULT_SIGNED_URL_EXPIRATION = 3600;

/**
 * Maximum keys allowed in bulk delete.
 */
export const MAX_BULK_DELETE_KEYS = 1000;
