/**
 * Storage Kit Controller
 *
 * HTTP controller for storage operations.
 */

import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { UploadedFile as StorageFile } from "@storage-kit/core";
import { StorageKitService } from "./service";

/**
 * Convert Multer file to normalized UploadedFile interface.
 */
function multerToUploadedFile(
  file: Express.Multer.File | undefined
): StorageFile | undefined {
  if (!file) return undefined;
  return {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

/**
 * Storage Kit controller for NestJS.
 *
 * Implements all endpoints defined in the OpenAPI specification:
 * - POST /:bucket/files - Upload file
 * - DELETE /:bucket/files/:filePath - Delete single file
 * - DELETE /:bucket/files - Bulk delete files
 * - GET /:bucket/signed-url - Generate signed URL
 * - GET /health - Health check
 */
@Controller()
export class StorageKitController {
  constructor(private readonly storageService: StorageKitService) {}

  /**
   * Health check endpoint.
   */
  @Get("health")
  async healthCheck(@Res() res: Response) {
    const result = await this.storageService.handleHealthCheck();
    const status =
      result.status === "healthy"
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(status).json(result);
  }

  /**
   * Upload file endpoint.
   */
  @Post(":bucket/files")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Param("bucket") bucket: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("path") path?: string,
    @Body("contentType") contentType?: string
  ) {
    const normalizedFile = multerToUploadedFile(file);
    return this.storageService.handleUpload(
      bucket,
      normalizedFile,
      path,
      contentType
    );
  }

  /**
   * Delete single file endpoint.
   */
  @Delete(":bucket/files/:filePath(*)")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param("bucket") bucket: string,
    @Param("filePath") filePath: string
  ) {
    // URL decode the file path
    const decodedPath = decodeURIComponent(filePath);
    await this.storageService.handleDelete(bucket, decodedPath);
  }

  /**
   * Bulk delete files endpoint.
   */
  @Delete(":bucket/files")
  @HttpCode(HttpStatus.OK)
  async bulkDeleteFiles(
    @Param("bucket") bucket: string,
    @Body("keys") keys?: string[]
  ) {
    return this.storageService.handleBulkDelete(bucket, keys);
  }

  /**
   * Signed URL generation endpoint.
   */
  @Get(":bucket/signed-url")
  async getSignedUrl(
    @Param("bucket") bucket: string,
    @Query("key") key?: string,
    @Query("type") type?: string,
    @Query("expiresIn") expiresIn?: string,
    @Query("contentType") contentType?: string
  ) {
    const result = await this.storageService.handleSignedUrl(bucket, key, type, {
      expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
      contentType,
    });

    // Convert Date to ISO string for JSON response
    return {
      ...result,
      expiresAt: result.expiresAt.toISOString(),
    };
  }
}
