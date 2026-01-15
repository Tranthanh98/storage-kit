/**
 * Provider Registry - Manages multiple storage provider instances
 *
 * This module provides a registry for managing multiple IStorageService
 * instances, enabling dynamic provider switching at runtime.
 */

import {
  type IStorageService,
  StorageError,
} from "../providers/storageService";
import type { StorageProvider, ProvidersMap, S3ProviderConfig, AzureProviderConfig } from "./types";

/**
 * Factory function to create a storage service from provider type and config.
 */
function createStorageServiceFromConfig(
  providerType: StorageProvider,
  config: S3ProviderConfig | AzureProviderConfig
): IStorageService {
  switch (providerType) {
    case "minio":
      return new (require("../providers/minioStorageService").MinioStorageService)(
        config
      );
    case "backblaze":
      return new (require("../providers/backblazeStorageService").BackBlazeStorageService)(
        config
      );
    case "cloudflare-r2":
      return new (require("../providers/cloudflareR2StorageService").CloudflareR2StorageService)(
        config
      );
    case "s3":
      return new (require("../providers/amazonS3StorageService").AmazonS3StorageService)(
        config
      );
    case "gcs":
      return new (require("../providers/googleCloudStorageService").GoogleCloudStorageService)(
        config
      );
    case "spaces":
      return new (require("../providers/digitalOceanSpacesService").DigitalOceanSpacesService)(
        config
      );
    case "azure":
      return new (require("../providers/azureBlobStorageService").AzureBlobStorageService)(
        config
      );
    default:
      throw new StorageError(
        "PROVIDER_ERROR",
        `Unknown provider type: ${providerType}`,
        { type: providerType }
      );
  }
}

/**
 * Registry for managing multiple storage provider instances.
 *
 * Providers are eagerly initialized at construction time for fail-fast behavior.
 * Use `get()` to retrieve a specific provider's service instance.
 *
 * @example
 * ```typescript
 * const registry = new ProviderRegistry({
 *   minio: { endpoint: "...", accessKeyId: "...", secretAccessKey: "..." },
 *   "cloudflare-r2": { endpoint: "...", accessKeyId: "...", secretAccessKey: "..." },
 * });
 *
 * const minioService = registry.get("minio");
 * const r2Service = registry.get("cloudflare-r2");
 * ```
 */
export class ProviderRegistry {
  private readonly _services: Map<StorageProvider, IStorageService>;
  private readonly _configs: ProvidersMap;

  /**
   * Create a new provider registry.
   *
   * @param providers - Map of provider types to their configurations
   * @throws {StorageError} If any provider configuration is invalid
   */
  constructor(providers: ProvidersMap) {
    this._configs = providers;
    this._services = new Map();

    // Eagerly initialize all providers (fail-fast)
    for (const [providerType, config] of Object.entries(providers)) {
      if (!config) continue; // Skip undefined configs
      
      try {
        const service = createStorageServiceFromConfig(
          providerType as StorageProvider,
          config
        );
        this._services.set(providerType as StorageProvider, service);
      } catch (error) {
        throw new StorageError(
          "PROVIDER_ERROR",
          `Failed to initialize provider "${providerType}": ${
            error instanceof Error ? error.message : String(error)
          }`,
          { providerName: providerType, originalError: error }
        );
      }
    }
  }

  /**
   * Get a storage service by provider type.
   *
   * @param providerType - The provider type (e.g., "minio", "s3", "cloudflare-r2")
   * @returns The storage service for the provider
   * @throws {StorageError} PROVIDER_NOT_CONFIGURED if provider is not registered
   */
  get(providerType: StorageProvider): IStorageService {
    const service = this._services.get(providerType);
    if (!service) {
      const availableProviders = Array.from(this._services.keys());
      throw new StorageError(
        "PROVIDER_NOT_CONFIGURED",
        `Provider "${providerType}" is not configured. Available providers: ${
          availableProviders.length > 0
            ? availableProviders.join(", ")
            : "(none)"
        }`,
        { requestedProvider: providerType, availableProviders }
      );
    }
    return service;
  }

  /**
   * Check if a provider is registered.
   *
   * @param providerType - The provider type
   * @returns True if the provider is registered
   */
  has(providerType: StorageProvider): boolean {
    return this._services.has(providerType);
  }

  /**
   * Get all registered provider types.
   *
   * @returns Array of provider types
   */
  getProviderNames(): StorageProvider[] {
    return Array.from(this._services.keys());
  }

  /**
   * Get the configuration for a specific provider.
   *
   * @param providerType - The provider type
   * @returns The provider configuration, or undefined if not found
   */
  getConfig(providerType: StorageProvider): S3ProviderConfig | AzureProviderConfig | undefined {
    return this._configs[providerType];
  }
}
