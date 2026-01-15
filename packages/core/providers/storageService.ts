/**
 * Standard error codes for storage operations.
 * These codes match the OpenAPI specification error codes.
 */
export type StorageErrorCode =
  | "BUCKET_NOT_FOUND"
  | "FILE_NOT_FOUND"
  | "MISSING_FILE"
  | "MISSING_REQUIRED_PARAM"
  | "INVALID_SIGNED_URL_TYPE"
  | "EMPTY_KEYS_ARRAY"
  | "KEYS_LIMIT_EXCEEDED"
  | "UPLOAD_FAILED"
  | "DELETE_FAILED"
  | "SIGNED_URL_FAILED"
  | "PROVIDER_ERROR"
  | "PROVIDER_NOT_CONFIGURED";

/**
 * Standard error class for storage operations.
 * Provides consistent error format across all providers.
 */
export class StorageError extends Error {
  constructor(
    public readonly code: StorageErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "StorageError";
  }

  /**
   * Convert to JSON format matching the OpenAPI error response schema.
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Response from file upload operation.
 */
export interface FileUploadResponse {
  /** The public URL of the uploaded file */
  url: string;
  /** The storage key (path) of the uploaded file */
  key: string;
}

/**
 * Options for file upload operation.
 */
export interface UploadOptions {
  /** Whether to overwrite existing file */
  upsert?: boolean;
  /** MIME type of the file */
  contentType?: string;
}

/**
 * Response from presigned URL generation.
 */
export interface SignedUrlResponse {
  /** The presigned URL for upload (PUT) or download (GET) */
  signedUrl: string;
  /** The eventual public URL of the file (only for upload type) */
  publicUrl?: string;
  /** When the presigned URL expires */
  expiresAt: Date;
}

/**
 * Options for presigned URL generation.
 */
export interface SignedUrlOptions {
  /** MIME type for the upload (enforced by the signed URL) */
  contentType?: string;
  /** Expiration time in seconds (default: 3600, max: 604800) */
  expiresIn?: number;
}

/**
 * Result of a single file deletion in bulk delete.
 */
export interface BulkDeleteFailure {
  /** The file key that failed to delete */
  key: string;
  /** Error code explaining the failure */
  reason: StorageErrorCode;
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
 * Health check response.
 */
export interface HealthCheckResponse {
  /** Health status */
  status: "healthy" | "unhealthy";
  /** Provider name (when healthy) */
  provider?: string;
  /** Error message (when unhealthy) */
  error?: string;
}

/**
 * Base configuration options for all storage providers.
 */
export interface BaseStorageConfig {
  /** Public URL base for generating file URLs (optional) */
  publicUrlBase?: string;
  /** Default expiration time for presigned URLs in seconds */
  defaultSignedUrlExpiration?: number;
}

/**
 * Configuration for S3-compatible providers (AWS S3, MinIO, R2, B2, GCS, Spaces).
 */
export interface S3Config extends BaseStorageConfig {
  type?: "s3" | "minio" | "r2" | "backblaze" | "gcs" | "spaces";
  /** S3-compatible endpoint URL */
  endpoint?: string;
  /** Access key ID */
  accessKeyId: string;
  /** Secret access key */
  secretAccessKey: string;
  /** AWS region */
  region?: string;
}

/**
 * Configuration for Azure Blob Storage using connection string.
 */
export interface AzureConfigConnectionString extends BaseStorageConfig {
  type: "azure";
  /** Azure connection string */
  connectionString: string;
}

/**
 * Configuration for Azure Blob Storage using account name and key.
 */
export interface AzureConfigAccount extends BaseStorageConfig {
  type: "azure";
  /** Azure storage account name */
  accountName: string;
  /** Azure storage account key */
  accountKey: string;
}

/**
 * Configuration for Azure Blob Storage.
 */
export type AzureConfig = AzureConfigConnectionString | AzureConfigAccount;

/**
 * Configuration options for storage providers.
 */
export type StorageConfig = S3Config | AzureConfig;

/**
 * Interface defining the storage service contract.
 * All storage providers must implement this interface.
 *
 * This interface aligns with the Storage Kit HTTP API specification
 * defined in openapi/storage-api.yaml.
 */
export interface IStorageService {
  /**
   * Select a bucket for subsequent operations.
   * @param bucketName - The name of the bucket
   * @returns The storage service instance (for chaining)
   */
  getBucket(bucketName: string): IStorageService;

  /**
   * Upload a file to storage.
   * @param file - File content as Buffer or Uint8Array
   * @param fileName - Name of the file
   * @param pathFolder - Optional folder path prefix
   * @param options - Upload options (contentType, upsert)
   * @returns Promise resolving to upload response with URL and key
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket doesn't exist
   * @throws {StorageError} UPLOAD_FAILED if upload fails
   */
  uploadFile(
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse>;

  /**
   * Get the public URL of a file.
   * @param key - The file key (path) in the bucket
   * @returns Promise resolving to the public URL
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket not selected
   */
  getFileUrl(key: string): Promise<string>;

  /**
   * Delete a single file from storage.
   * @param key - The file key (path) to delete
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket doesn't exist
   * @throws {StorageError} FILE_NOT_FOUND if file doesn't exist
   * @throws {StorageError} DELETE_FAILED if deletion fails
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Delete multiple files from storage.
   * @param keys - Array of file keys to delete (max 1000)
   * @returns Promise resolving to bulk delete response
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket doesn't exist
   * @throws {StorageError} EMPTY_KEYS_ARRAY if keys array is empty
   * @throws {StorageError} KEYS_LIMIT_EXCEEDED if keys array exceeds 1000
   */
  deleteFiles(keys: string[]): Promise<BulkDeleteResponse>;

  /**
   * Generate a presigned URL for file upload.
   * @param key - The file key (path) for the upload
   * @param options - Signed URL options (contentType, expiresIn)
   * @returns Promise resolving to signed URL response
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket not selected
   * @throws {StorageError} SIGNED_URL_FAILED if generation fails
   */
  getPresignedUploadUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse>;

  /**
   * Generate a presigned URL for file download.
   * @param key - The file key (path) for the download
   * @param options - Signed URL options (expiresIn)
   * @returns Promise resolving to signed URL response
   * @throws {StorageError} BUCKET_NOT_FOUND if bucket not selected
   * @throws {StorageError} SIGNED_URL_FAILED if generation fails
   */
  getPresignedDownloadUrl(
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse>;

  /**
   * Check the health of the storage provider.
   * @returns Promise resolving to health check response
   */
  healthCheck(): Promise<HealthCheckResponse>;
}
