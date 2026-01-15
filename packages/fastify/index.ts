/**
 * @storage-kit/fastify
 *
 * Fastify plugin for Storage Kit - plug-and-play storage HTTP endpoints.
 *
 * @packageDocumentation
 */

export {
  FastifyStorageKit,
  createStorageErrorHandler,
  // New unified API (recommended)
  createStorageKit,
  // Legacy API (deprecated, kept for backward compatibility)
  storageKitPlugin,
  type FastifyStorageKitConfig,
  type IFastifyStorageKitService,
  type SwaggerOptions,
} from "./src/plugin";

// Re-export core types for convenience
export type {
  HttpErrorResponse,
  StorageKitConfig,
  StorageProvider,
  UploadedFile,
} from "@storage-kit/core";
