/**
 * @storage-kit/fastify
 *
 * Fastify plugin for Storage Kit - plug-and-play storage HTTP endpoints.
 *
 * @packageDocumentation
 */

export {
  storageKitPlugin,
  createStorageErrorHandler,
  type FastifyStorageKitConfig,
  type SwaggerOptions,
} from "./src/plugin";

// Re-export core types for convenience
export type {
  StorageKitConfig,
  UploadedFile,
  StorageProvider,
  HttpErrorResponse,
} from "@storage-kit/core";
