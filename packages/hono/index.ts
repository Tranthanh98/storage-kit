/**
 * @storage-kit/hono
 *
 * Hono adapter for Storage Kit - edge-compatible storage HTTP endpoints.
 *
 * @packageDocumentation
 */

export {
  storageKit,
  storageErrorMiddleware,
  type HonoStorageKitConfig,
  type SwaggerOptions,
} from "./src/adapter";

// Re-export core types for convenience
export type {
  StorageKitConfig,
  UploadedFile,
  StorageProvider,
  HttpErrorResponse,
} from "@storage-kit/core";
