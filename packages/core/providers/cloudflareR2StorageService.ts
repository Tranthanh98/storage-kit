import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IStorageService,
  type S3Config,
  type SignedUrlOptions,
  type SignedUrlResponse,
  StorageError,

  type UploadOptions,
} from "./storageService";

/** Default expiration time for signed URLs in seconds (1 hour) */
const DEFAULT_SIGNED_URL_EXPIRATION = 3600;

/** Maximum number of keys allowed in bulk delete */
const MAX_BULK_DELETE_KEYS = 1000;

/**
 * Storage service implementation for Cloudflare R2 (S3-compatible API).
 *
 * Cloudflare R2 is an S3-compatible object storage service with zero egress fees.
 * This implementation uses the AWS S3 SDK with the 'auto' region setting.
 *
 * @example
 * ```typescript
 * const storage = new CloudflareR2StorageService({
 *   endpoint: "https://<account-id>.r2.cloudflarestorage.com",
 *   accessKeyId: "your-access-key-id",
 *   secretAccessKey: "your-secret-access-key",
 *   publicUrlBase: "https://your-domain.com",
 * });
 *
 * const result = await storage
 *   .getBucket("my-bucket")
 *   .uploadFile(buffer, "image.png");
 * ```
 */
export class CloudflareR2StorageService implements IStorageService {
  private s3Client: S3Client;
  private currentBucket: string = "";
  private readonly config: S3Config;

  constructor(config?: Partial<S3Config>) {
    this.config = {
      endpoint: config?.endpoint ?? process.env.CLOUDFLARE_R2_ENDPOINT ?? "",
      accessKeyId: config?.accessKeyId ?? process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: config?.secretAccessKey ?? process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? "",
      region: config?.region ?? "auto", // R2 uses 'auto' region
      publicUrlBase: config?.publicUrlBase ?? process.env.CLOUDFLARE_R2_PUBLIC_URL,
      defaultSignedUrlExpiration: config?.defaultSignedUrlExpiration ?? DEFAULT_SIGNED_URL_EXPIRATION,
    };

    this.s3Client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: true, // Required for S3-compatible services
    });
  }

  /**
   * Select a bucket for subsequent operations.
   */
  getBucket(bucketName: string): IStorageService {
    this.currentBucket = bucketName;
    return this;
  }

  /**
   * Ensure a bucket is selected before operations.
   */
  private ensureBucket(): void {
    if (!this.currentBucket) {
      throw new StorageError(
        "BUCKET_NOT_FOUND",
        "No bucket selected. Call getBucket() first.",
        {}
      );
    }
  }

  /**
   * Build a key from folder and filename.
   */
  private buildKey(fileName: string, pathFolder?: string): string {
    if (!pathFolder) return fileName;
    const cleanFolder = pathFolder.replace(/^\/+|\/+$/g, "");
    return cleanFolder ? `${cleanFolder}/${fileName}` : fileName;
  }

  /**
   * Get the public URL for a key.
   */
  private getPublicUrl(key: string): string {
    if (this.config.publicUrlBase) {
      return `${this.config.publicUrlBase}/${this.currentBucket}/${key}`;
    }
    // Default R2 URL pattern
    return `${this.config.endpoint}/${this.currentBucket}/${key}`;
  }

  /**
   * Upload a file to storage.
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse> {
    this.ensureBucket();

    const key = this.buildKey(fileName, pathFolder);

    try {
      const command = new PutObjectCommand({
        Bucket: this.currentBucket,
        Key: key,
        Body: file,
        ContentType: options?.contentType ?? "application/octet-stream",
        CacheControl: "max-age=2592000", // 30 days
      });

      await this.s3Client.send(command);

      return {
        url: this.getPublicUrl(key),
        key,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (/NoSuchBucket/i.test(message)) {
        throw new StorageError("BUCKET_NOT_FOUND", "The specified bucket does not exist", {
          bucket: this.currentBucket,
        });
      }
      throw new StorageError("UPLOAD_FAILED", `Failed to upload file: ${message}`, {
        key,
        bucket: this.currentBucket,
      });
    }
  }

  /**
   * Get the public URL of a file.
   */
  async getFileUrl(key: string): Promise<string> {
    this.ensureBucket();
    return this.getPublicUrl(key);
  }

  /**
   * Delete a single file from storage.
   */
  async deleteFile(key: string): Promise<void> {
    this.ensureBucket();

    try {
      // Check if file exists first
      const listCommand = new ListObjectsV2Command({
        Bucket: this.currentBucket,
        Prefix: key,
        MaxKeys: 1,
      });
      const listResponse = await this.s3Client.send(listCommand);

      // Verify exact match (not just prefix match)
      const exists = listResponse.Contents?.some((obj) => obj.Key === key);
      if (!exists) {
        throw new StorageError("FILE_NOT_FOUND", "The requested file does not exist", {
          key,
          bucket: this.currentBucket,
        });
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.currentBucket,
        Key: key,
      });
      await this.s3Client.send(deleteCommand);
    } catch (error) {
      if (error instanceof StorageError) throw error;

      const message = error instanceof Error ? error.message : "Unknown error";
      if (/NoSuchBucket/i.test(message)) {
        throw new StorageError("BUCKET_NOT_FOUND", "The specified bucket does not exist", {
          bucket: this.currentBucket,
        });
      }
      throw new StorageError("DELETE_FAILED", `Failed to delete file: ${message}`, {
        key,
        bucket: this.currentBucket,
      });
    }
  }

  /**
   * Delete multiple files from storage.
   */
  async deleteFiles(keys: string[]): Promise<BulkDeleteResponse> {
    this.ensureBucket();

    if (keys.length === 0) {
      throw new StorageError("EMPTY_KEYS_ARRAY", "The 'keys' array must not be empty", {});
    }

    if (keys.length > MAX_BULK_DELETE_KEYS) {
      throw new StorageError(
        "KEYS_LIMIT_EXCEEDED",
        `The 'keys' array must not exceed ${MAX_BULK_DELETE_KEYS} items`,
        { provided: keys.length, maximum: MAX_BULK_DELETE_KEYS }
      );
    }

    try {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.currentBucket,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
          Quiet: false,
        },
      });

      const response = await this.s3Client.send(deleteCommand);

      const deleted = response.Deleted?.length ?? 0;
      const failed = (response.Errors ?? []).map((err) => ({
        key: err.Key ?? "unknown",
        reason: "DELETE_FAILED" as const,
      }));

      return { deleted, failed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (/NoSuchBucket/i.test(message)) {
        throw new StorageError("BUCKET_NOT_FOUND", "The specified bucket does not exist", {
          bucket: this.currentBucket,
        });
      }
      throw new StorageError("DELETE_FAILED", `Failed to delete files: ${message}`, {
        bucket: this.currentBucket,
      });
    }
  }

  /**
   * Generate a presigned URL for file upload.
   */
  async getPresignedUploadUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse> {
    this.ensureBucket();

    const expiresIn = options?.expiresIn ?? this.config.defaultSignedUrlExpiration ?? DEFAULT_SIGNED_URL_EXPIRATION;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    try {
      const command = new PutObjectCommand({
        Bucket: this.currentBucket,
        Key: key,
        ContentType: options?.contentType ?? "application/octet-stream",
        CacheControl: "max-age=2592000",
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        signedUrl,
        publicUrl: this.getPublicUrl(key),
        expiresAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new StorageError("SIGNED_URL_FAILED", `Failed to generate presigned URL: ${message}`, {
        key,
        bucket: this.currentBucket,
      });
    }
  }

  /**
   * Generate a presigned URL for file download.
   */
  async getPresignedDownloadUrl(
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse> {
    this.ensureBucket();

    const expiresIn = options?.expiresIn ?? this.config.defaultSignedUrlExpiration ?? DEFAULT_SIGNED_URL_EXPIRATION;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    try {
      const command = new GetObjectCommand({
        Bucket: this.currentBucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        signedUrl,
        expiresAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new StorageError("SIGNED_URL_FAILED", `Failed to generate presigned URL: ${message}`, {
        key,
        bucket: this.currentBucket,
      });
    }
  }

  /**
   * Check the health of the storage provider.
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      if (this.currentBucket) {
        const command = new HeadBucketCommand({ Bucket: this.currentBucket });
        await this.s3Client.send(command);
      } else {
        // Just verify we can connect
        const command = new ListObjectsV2Command({
          Bucket: "health-check-bucket",
          MaxKeys: 1,
        });
        try {
          await this.s3Client.send(command);
        } catch {
          // Bucket not existing is fine, we just want to verify connectivity
        }
      }

      return {
        status: "healthy",
        provider: "cloudflare-r2",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        status: "unhealthy",
        error: message,
      };
    }
  }
}
