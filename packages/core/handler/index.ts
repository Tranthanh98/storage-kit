/**
 * Storage Handler Module
 *
 * Exports the framework-agnostic handler and related utilities.
 */

export { StorageHandler, type SignedUrlType } from "./StorageHandler";
export {
  mapErrorToResponse,
  mapAnyErrorToResponse,
  isStorageError,
} from "./errorMapping";
export type {
  StorageProvider,
  UploadedFile,
  StorageKitConfig,
  HttpErrorResponse,
} from "./types";
export {
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_SIGNED_URL_EXPIRATION,
  MAX_BULK_DELETE_KEYS,
} from "./types";
