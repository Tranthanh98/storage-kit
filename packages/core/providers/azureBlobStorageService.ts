import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
  ContainerClient,
} from "@azure/storage-blob";
import {
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IStorageService,
  type AzureConfig,
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
 * Storage service implementation for Azure Blob Storage.
 *
 * Uses the native @azure/storage-blob SDK.
 */
export class AzureBlobStorageService implements IStorageService {
  private blobServiceClient: BlobServiceClient;
  private currentContainer: string = "";
  private readonly config: AzureConfig;

  constructor(config: AzureConfig) {
    this.config = config;

    if (config.type !== "azure") {
      throw new Error("Invalid configuration type for AzureBlobStorageService");
    }

    if ("connectionString" in config) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    } else {
      const credential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
      const url = `https://${config.accountName}.blob.core.windows.net`;
      this.blobServiceClient = new BlobServiceClient(url, credential);
    }
  }

  /**
   * Helper to get Shared Key Credential for SAS generation.
   */
  private getCredential(): StorageSharedKeyCredential {
    if ("accountName" in this.config) {
      return new StorageSharedKeyCredential(this.config.accountName, this.config.accountKey);
    }
    
    // Parse connection string
    const matchName = this.config.connectionString.match(/AccountName=([^;]+)/);
    const matchKey = this.config.connectionString.match(/AccountKey=([^;]+)/);
    
    if (matchName && matchKey) {
      return new StorageSharedKeyCredential(matchName[1], matchKey[1]);
    }
    
    throw new StorageError(
      "PROVIDER_ERROR",
      "Could not extract AccountName and AccountKey from connection string for SAS generation",
      {}
    );
  }

  getBucket(bucketName: string): IStorageService {
    this.currentContainer = bucketName;
    return this;
  }

  private ensureContainer(): void {
    if (!this.currentContainer) {
      throw new StorageError("BUCKET_NOT_FOUND", "No container selected. Call getBucket() first.", {});
    }
  }

  private getContainerClient(): ContainerClient {
    this.ensureContainer();
    return this.blobServiceClient.getContainerClient(this.currentContainer);
  }

  async uploadFile(
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse> {
    const containerClient = this.getContainerClient();
    
    // Build blob name (key)
    const blobName = pathFolder 
      ? `${pathFolder.replace(/^\/+|\/+$/g, "")}/${fileName}`
      : fileName;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      // Check if container exists first? Azure throws 404 if container doesn't exist
      // But upload doesn't check container existence explicitly unless we try.
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options?.contentType ?? "application/octet-stream",
          blobCacheControl: "max-age=8640000",
        }
      };

      await blockBlobClient.upload(file, file.length, uploadOptions);

      return {
        url: blockBlobClient.url,
        key: blobName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      // Azure SDK errors usually have `code` property
      const code = (error as any).code;
      const statusCode = (error as any).statusCode;

      if (code === "ContainerNotFound" || statusCode === 404) {
         throw new StorageError("BUCKET_NOT_FOUND", "The specified container does not exist", {
          container: this.currentContainer,
        });
      }

      throw new StorageError("UPLOAD_FAILED", `Failed to upload file: ${message}`, {
        key: blobName,
        container: this.currentContainer,
      });
    }
  }

  async getFileUrl(key: string): Promise<string> {
    const containerClient = this.getContainerClient();
    const blobClient = containerClient.getBlobClient(key);
    return Promise.resolve(blobClient.url);
  }

  async deleteFile(key: string): Promise<void> {
    const containerClient = this.getContainerClient();
    const blobClient = containerClient.getBlobClient(key);

    try {
      // Check existence first? Or just delete and handle 404?
      // Spec says: "WHEN the specified file does not exist... THEN error code is FILE_NOT_FOUND"
      // Azure `delete` throws if not found?
      // `deleteIfExists` returns boolean.
      
      const response = await blobClient.deleteIfExists();
      if (!response.succeeded) {
        // Technically this means it didn't exist or failed.
        // If we want strict "FILE_NOT_FOUND", we should check if it didn't exist.
        // `deleteIfExists` returns `succeeded: false` if blob didn't exist.
        // BUT wait, `deleteIfExists` might catch other errors?
        // Using `delete` is more explicit about errors.
      }
      
      // Let's use delete() to get the error if missing
      await blobClient.delete();

    } catch (error) {
      const code = (error as any).code;
      const statusCode = (error as any).statusCode;

      if (code === "BlobNotFound" || statusCode === 404) {
        throw new StorageError("FILE_NOT_FOUND", "The requested file does not exist", {
          key,
          container: this.currentContainer,
        });
      }
      if (code === "ContainerNotFound") {
        throw new StorageError("BUCKET_NOT_FOUND", "The specified container does not exist", {
          container: this.currentContainer,
        });
      }

      throw new StorageError("DELETE_FAILED", `Failed to delete file: ${code ?? statusCode}`, {
        key,
        container: this.currentContainer,
      });
    }
  }

  async deleteFiles(keys: string[]): Promise<BulkDeleteResponse> {
    this.ensureContainer();
    
    if (keys.length === 0) {
      throw new StorageError("EMPTY_KEYS_ARRAY", "The 'keys' array must not be empty", {});
    }
    if (keys.length > MAX_BULK_DELETE_KEYS) {
      throw new StorageError("KEYS_LIMIT_EXCEEDED", `Keys limit exceeded`, { maximum: MAX_BULK_DELETE_KEYS });
    }

    const containerClient = this.getContainerClient();
    const failed: { key: string; reason: any }[] = [];
    let deletedCount = 0;

    // Parallel deletion with concurrency limit could be better, but simple Promise.all is okay for <1000 items
    // assuming network can handle it. AWS SDK sends one request. Azure needs N requests.
    // 1000 requests might be too much for Promise.all.
    // Let's do batches of 50.
    
    const batchSize = 50;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await Promise.all(batch.map(async (key) => {
        try {
          const blobClient = containerClient.getBlobClient(key);
          await blobClient.delete();
          deletedCount++;
        } catch (error) {
           const code = (error as any).code;
           if (code === "BlobNotFound") {
             // For bulk delete, if file not found, we usually consider it "done" or report it?
             // Spec: "response includes failed keys with FILE_NOT_FOUND reason"
             failed.push({ key, reason: "FILE_NOT_FOUND" });
           } else if (code === "ContainerNotFound") {
             // If container missing, all fail.
             // But we are inside loop.
             failed.push({ key, reason: "BUCKET_NOT_FOUND" });
           } else {
             failed.push({ key, reason: "DELETE_FAILED" });
           }
        }
      }));
    }
    
    // If container was not found, we might want to throw BUCKET_NOT_FOUND for the whole operation?
    // But we already started.
    // If ANY failure was ContainerNotFound, we should probably throw BUCKET_NOT_FOUND?
    const containerError = failed.find(f => f.reason === "BUCKET_NOT_FOUND");
    if (containerError) {
       throw new StorageError("BUCKET_NOT_FOUND", "The specified container does not exist", {
          container: this.currentContainer,
       });
    }

    return {
      deleted: deletedCount,
      failed: failed as any,
    };
  }

  async getPresignedUploadUrl(
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse> {
    const containerClient = this.getContainerClient();
    const expiresIn = options?.expiresIn ?? this.config.defaultSignedUrlExpiration ?? DEFAULT_SIGNED_URL_EXPIRATION;
    const expiresOn = new Date(Date.now() + expiresIn * 1000);

    try {
      const credential = this.getCredential();
      const sasToken = generateBlobSASQueryParameters({
        containerName: this.currentContainer,
        blobName: key,
        permissions: BlobSASPermissions.parse("cw"), // Create/Write
        startsOn: new Date(Date.now() - 60 * 1000), // Start 1 min ago to avoid clock skew
        expiresOn,
        protocol: SASProtocol.Https,
        contentType: options?.contentType,
      }, credential).toString();

      const blobClient = containerClient.getBlobClient(key);
      const signedUrl = `${blobClient.url}?${sasToken}`;

      return {
        signedUrl,
        publicUrl: blobClient.url,
        expiresAt: expiresOn,
      };
    } catch (error) {
       const message = error instanceof Error ? error.message : "Unknown error";
       throw new StorageError("SIGNED_URL_FAILED", `Failed to generate signed URL: ${message}`, { key });
    }
  }

  async getPresignedDownloadUrl(
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse> {
    const containerClient = this.getContainerClient();
    const expiresIn = options?.expiresIn ?? this.config.defaultSignedUrlExpiration ?? DEFAULT_SIGNED_URL_EXPIRATION;
    const expiresOn = new Date(Date.now() + expiresIn * 1000);

    try {
      const credential = this.getCredential();
      const sasToken = generateBlobSASQueryParameters({
        containerName: this.currentContainer,
        blobName: key,
        permissions: BlobSASPermissions.parse("r"), // Read
        startsOn: new Date(Date.now() - 60 * 1000),
        expiresOn,
        protocol: SASProtocol.Https,
      }, credential).toString();

      const blobClient = containerClient.getBlobClient(key);
      const signedUrl = `${blobClient.url}?${sasToken}`;

      return {
        signedUrl,
        expiresAt: expiresOn,
      };
    } catch (error) {
       const message = error instanceof Error ? error.message : "Unknown error";
       throw new StorageError("SIGNED_URL_FAILED", `Failed to generate signed URL: ${message}`, { key });
    }
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      // List containers with max 1 result
      const iterator = this.blobServiceClient.listContainers().byPage({ maxPageSize: 1 });
      await iterator.next();
      
      return {
        status: "healthy",
        provider: "azure",
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
