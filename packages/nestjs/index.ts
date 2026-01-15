/**
 * @storage-kit/nestjs
 *
 * NestJS module for Storage Kit - plug-and-play storage HTTP endpoints.
 *
 * @packageDocumentation
 */

// Module
export { StorageKitModule } from "./src/module";

// Service
export { StorageKitService } from "./src/service";

// Controller
export { StorageKitController } from "./src/controller";

// Filters
export { StorageErrorFilter, AllExceptionsFilter } from "./src/filter";

// Config types and tokens
export {
  type NestJSStorageKitConfig,
  type StorageKitOptionsFactory,
  type StorageKitAsyncOptions,
  type SwaggerOptions,
  STORAGE_KIT_CONFIG,
  STORAGE_KIT_SERVICE,
  STORAGE_KIT_HANDLER,
} from "./src/config";

// Re-export core types for convenience
export type {
  StorageKitConfig,
  UploadedFile,
  StorageProvider,
  HttpErrorResponse,
  IStorageService,
  FileUploadResponse,
  BulkDeleteResponse,
  SignedUrlResponse,
  HealthCheckResponse,
} from "@storage-kit/core";

export { StorageError, StorageHandler } from "@storage-kit/core";
