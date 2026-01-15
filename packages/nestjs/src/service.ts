/**
 * Storage Kit Service
 *
 * Injectable wrapper around StorageHandler for NestJS.
 */

import { Injectable, Inject, Optional } from "@nestjs/common";
import {
  StorageHandler,
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IProviderScopedStorageKit,
  type IStorageKitService,
  type SignedUrlResponse,
  type SignedUrlOptions,
  type StorageProvider,
  type UploadedFile,
} from "@storage-kit/core";
import { STORAGE_KIT_HANDLER, STORAGE_KIT_INSTANCE } from "./config";

/**
 * Storage Kit service for NestJS dependency injection.
 *
 * Wraps the StorageHandler to provide storage operations.
 * Also provides access to multi-provider features via useProvider().
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private storage: StorageKitService) {}
 *
 *   async uploadAvatar(file: UploadedFile) {
 *     return this.storage.handleUpload("my-bucket", file, "avatars");
 *   }
 *
 *   // Multi-provider usage
 *   async deleteFromR2(key: string) {
 *     const r2 = this.storage.useProvider("cloudflare-r2");
 *     await r2.bucket("images").deleteFile(key);
 *   }
 * }
 * ```
 */
@Injectable()
export class StorageKitService {
  constructor(
    @Inject(STORAGE_KIT_HANDLER) private readonly handler: StorageHandler,
    @Optional()
    @Inject(STORAGE_KIT_INSTANCE)
    private readonly storageKit?: IStorageKitService
  ) {}

  /**
   * Switch to a specific provider for subsequent operations.
   *
   * @param providerType - The provider type (must be configured in `providers` map)
   * @returns A provider-scoped storage kit instance
   * @throws {StorageError} PROVIDER_NOT_CONFIGURED if provider is not configured
   *
   * @example
   * ```typescript
   * const r2 = storageService.useProvider("cloudflare-r2");
   * await r2.bucket("images").deleteFile("photo.jpg");
   * ```
   */
  useProvider(providerType: StorageProvider): IProviderScopedStorageKit {
    if (!this.storageKit) {
      throw new Error(
        "StorageKit instance not available. Ensure the module is properly configured."
      );
    }
    return this.storageKit.useProvider(providerType);
  }

  /**
   * Resolve the bucket name from URL parameter.
   */
  resolveBucket(bucket: string): string {
    return this.handler.resolveBucket(bucket);
  }

  /**
   * Handle file upload.
   */
  async handleUpload(
    bucket: string,
    file: UploadedFile | undefined | null,
    path?: string,
    contentType?: string
  ): Promise<FileUploadResponse> {
    return this.handler.handleUpload(bucket, file, path, contentType);
  }

  /**
   * Handle single file deletion.
   */
  async handleDelete(bucket: string, filePath: string): Promise<void> {
    return this.handler.handleDelete(bucket, filePath);
  }

  /**
   * Handle bulk file deletion.
   */
  async handleBulkDelete(
    bucket: string,
    keys: string[] | undefined
  ): Promise<BulkDeleteResponse> {
    return this.handler.handleBulkDelete(bucket, keys);
  }

  /**
   * Handle signed URL generation.
   */
  async handleSignedUrl(
    bucket: string,
    key: string | undefined,
    type: string | undefined,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse> {
    return this.handler.handleSignedUrl(bucket, key, type, options);
  }

  /**
   * Handle health check.
   */
  async handleHealthCheck(): Promise<HealthCheckResponse> {
    return this.handler.handleHealthCheck();
  }
}
