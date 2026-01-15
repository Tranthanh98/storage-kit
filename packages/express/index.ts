/**
 * @storage-kit/express
 *
 * Express.js adapter for Storage Kit - plug-and-play storage HTTP endpoints.
 *
 * @packageDocumentation
 */

export {
  ExpressStorageKit,
  // New unified API (recommended)
  createStorageKit,
  storageErrorHandler,
  // Legacy API (deprecated, kept for backward compatibility)
  storageKit,
  type ExpressStorageKitConfig,
  type SwaggerOptions,
} from "./src/adapter";

// Re-export core types for convenience
export type {
  HttpErrorResponse,
  IStorageKitService,
  StorageKitConfig,
  StorageProvider,
  UploadedFile,
} from "@storage-kit/core";
