/**
 * Storage Kit Service
 *
 * Injectable wrapper around StorageHandler for NestJS.
 */

import { Injectable, Inject } from "@nestjs/common";
import {
  StorageHandler,
  type BulkDeleteResponse,
  type FileUploadResponse,
  type HealthCheckResponse,
  type SignedUrlResponse,
  type SignedUrlOptions,
  type UploadedFile,
} from "@storage-kit/core";
import { STORAGE_KIT_HANDLER } from "./config";

/**
 * Storage Kit service for NestJS dependency injection.
 *
 * Wraps the StorageHandler to provide storage operations.
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
 * }
 * ```
 */
@Injectable()
export class StorageKitService {
  constructor(
    @Inject(STORAGE_KIT_HANDLER) private readonly handler: StorageHandler
  ) {}

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
