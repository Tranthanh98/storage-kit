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

export type StorageKitConfig = S3KitConfig | AzureKitConfig;

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
