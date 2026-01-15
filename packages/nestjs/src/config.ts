/**
 * Storage Kit Module Configuration
 */

import { ModuleMetadata, Type } from "@nestjs/common";
import type { StorageKitConfig, IStorageService } from "@storage-kit/core";

/**
 * Swagger UI customization options.
 */
export interface SwaggerOptions {
  /** Enable or disable Swagger UI (default: true) */
  enabled?: boolean;
  /** Custom path for Swagger UI (default: "/reference") */
  path?: string;
  /** Custom title for Swagger UI */
  title?: string;
  /** Custom description for Swagger UI */
  description?: string;
}

/**
 * NestJS-specific configuration options.
 */
export type NestJSStorageKitConfig = StorageKitConfig & {
  /** Custom storage service instance (overrides provider config) */
  storage?: IStorageService;
  /** Route prefix for storage endpoints (default: "storage") */
  routePrefix?: string;
  /** Whether to register the controller globally */
  global?: boolean;
  /** Enable Swagger UI at /reference (default: true) */
  swagger?: boolean | SwaggerOptions;
};

/**
 * Options factory for async configuration.
 */
export interface StorageKitOptionsFactory {
  createStorageKitOptions():
    | Promise<NestJSStorageKitConfig>
    | NestJSStorageKitConfig;
}

/**
 * Async module options.
 */
export interface StorageKitAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  /** Use existing provider */
  useExisting?: Type<StorageKitOptionsFactory>;
  /** Use class provider */
  useClass?: Type<StorageKitOptionsFactory>;
  /** Use factory provider */
  useFactory?: (
    ...args: unknown[]
  ) => Promise<NestJSStorageKitConfig> | NestJSStorageKitConfig;
  /** Inject dependencies for factory */
  inject?: unknown[];
  /** Make module global */
  global?: boolean;
}

/**
 * Injection token for Storage Kit configuration.
 */
export const STORAGE_KIT_CONFIG = "STORAGE_KIT_CONFIG";

/**
 * Injection token for Storage Kit service.
 */
export const STORAGE_KIT_SERVICE = "STORAGE_KIT_SERVICE";

/**
 * Injection token for Storage Kit handler.
 */
export const STORAGE_KIT_HANDLER = "STORAGE_KIT_HANDLER";

/**
 * Injection token for Storage Kit instance (IStorageKitService).
 * Use this to access multi-provider features like useProvider().
 */
export const STORAGE_KIT_INSTANCE = "STORAGE_KIT_INSTANCE";
