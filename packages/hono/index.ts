/**
 * @storage-kit/hono
 *
 * Hono adapter for Storage Kit - edge-compatible storage HTTP endpoints.
 *
 * @packageDocumentation
 */

export {
  HonoStorageKit,
  // New unified API (recommended)
  createStorageKit,
  storageErrorMiddleware,
  // Legacy API (deprecated, kept for backward compatibility)
  storageKit,
  type HonoStorageKitConfig,
  type IHonoStorageKitService,
  type SwaggerOptions,
} from "./src/adapter";

// Re-export core types for convenience
export type {
  HttpErrorResponse,
  StorageKitConfig,
  StorageProvider,
  UploadedFile,
} from "@storage-kit/core";
