/**
 * @storage-kit/express
 *
 * Express.js adapter for Storage Kit - plug-and-play storage HTTP endpoints.
 *
 * @packageDocumentation
 */

export {
  storageKit,
  storageErrorHandler,
  type ExpressStorageKitConfig,
  type SwaggerOptions,
} from "./src/adapter";

// Re-export core types for convenience
export type {
  StorageKitConfig,
  UploadedFile,
  StorageProvider,
  HttpErrorResponse,
} from "@storage-kit/core";
