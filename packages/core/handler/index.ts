/**
 * Storage Handler Module
 *
 * Exports the framework-agnostic handler and related utilities.
 */

export {
  isStorageError,
  mapAnyErrorToResponse,
  mapErrorToResponse,
} from "./errorMapping";
export { StorageHandler, type SignedUrlType } from "./StorageHandler";
export {
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_SIGNED_URL_EXPIRATION,
  MAX_BULK_DELETE_KEYS,
  isMultiProviderConfig,
} from "./types";
export type {
  AzureProviderConfig,
  AzureProvidersMap,
  HttpErrorResponse,
  MultiProviderStorageKitConfig,
  ProvidersMap,
  S3Provider,
  S3ProviderConfig,
  S3ProvidersMap,
  SingleProviderStorageKitConfig,
  StorageKitConfig,
  StorageProvider,
  UploadedFile,
} from "./types";

// Unified Storage Kit Instance exports
export { BaseStorageKit, type BaseStorageKitConfig } from "./BaseStorageKit";
export { ProviderRegistry } from "./ProviderRegistry";
export { ProviderScopedStorageKit } from "./ProviderScopedStorageKit";
export type {
  IProviderScopedStorageKit,
  IStorageKitService,
  StorageKitInstanceConfig,
} from "./StorageKitInstance";
