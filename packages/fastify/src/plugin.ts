/**
 * Fastify Adapter for Storage Kit
 *
 * Provides plug-and-play Fastify plugin for storage operations.
 */

import {
  type BulkDeleteResponse,
  createStorageService,
  DEFAULT_MAX_FILE_SIZE,
  type FileUploadResponse,
  type HealthCheckResponse,
  type IStorageService,
  mapAnyErrorToResponse,
  type SignedUrlOptions,
  type SignedUrlResponse,
  StorageError,
  StorageHandler,
  type StorageKitConfig,
  type UploadedFile,
  type UploadOptions,
} from "@storage-kit/core";
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { parse } from "yaml";

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
}

/**
 * Fastify-specific configuration options.
 */
export interface FastifyStorageKitConfig extends StorageKitConfig {
  /** Custom storage service instance (overrides provider config) */
  storage?: IStorageService;
  /** Route prefix for storage endpoints (default: none, uses Fastify register prefix) */
  prefix?: string;
  /** Enable Swagger UI at /reference (default: true) */
  swagger?: boolean | SwaggerOptions;
}

/**
 * Load and customize OpenAPI spec for Swagger UI.
 */
function loadOpenApiSpec(): object {
  try {
    // Resolve the @storage-kit/core package directory
    const corePkgPath = require.resolve("@storage-kit/core/package.json");
    const coreDir = dirname(corePkgPath);
    const specPath = resolve(coreDir, "openapi", "storage-api.yaml");
    const specContent = readFileSync(specPath, "utf8");
    const spec = parse(specContent) as Record<string, unknown>;

    // Update paths to be relative (remove /storage prefix)
    const paths = spec.paths as Record<string, unknown>;
    const updatedPaths: Record<string, unknown> = {};
    for (const [path, pathItem] of Object.entries(paths)) {
      const newPath = path.replace(/^\/storage/, "");
      updatedPaths[newPath || "/"] = pathItem;
    }
    spec.paths = updatedPaths;

    return spec;
  } catch (error) {
    console.warn("Failed to load OpenAPI spec for Swagger UI:", error);
    return {
      openapi: "3.0.3",
      info: {
        title: "Storage Kit API",
        version: "1.0.0",
        description: "OpenAPI spec could not be loaded.",
      },
      paths: {},
    };
  }
}

/**
 * Normalize swagger configuration to SwaggerOptions.
 */
function normalizeSwaggerConfig(
  swagger?: boolean | SwaggerOptions
): Required<SwaggerOptions> {
  if (swagger === false) {
    return {
      enabled: false,
      path: "/reference",
      title: "Storage Kit API Reference",
    };
  }
  if (swagger === true || swagger === undefined) {
    return {
      enabled: true,
      path: "/reference",
      title: "Storage Kit API Reference",
    };
  }
  return {
    enabled: swagger.enabled !== false,
    path: swagger.path || "/reference",
    title: swagger.title || "Storage Kit API Reference",
  };
}

/**
 * Service interface for Fastify Storage Kit.
 */
export interface IFastifyStorageKitService {
  /** Get the underlying storage service */
  readonly storage: IStorageService;
  /** Upload a file */
  uploadFile(
    bucket: string,
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse>;
  /** Delete a single file */
  deleteFile(bucket: string, key: string): Promise<void>;
  /** Delete multiple files */
  deleteFiles(bucket: string, keys: string[]): Promise<BulkDeleteResponse>;
  /** Generate a presigned URL for upload */
  getPresignedUploadUrl(
    bucket: string,
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse>;
  /** Generate a presigned URL for download */
  getPresignedDownloadUrl(
    bucket: string,
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse>;
  /** Health check */
  healthCheck(): Promise<HealthCheckResponse>;
  /** Get a bucket-scoped service */
  bucket(bucketName: string): IStorageService;
  /** Get the Fastify plugin */
  plugin(): FastifyPluginAsync<{ prefix?: string }>;
}

/**
 * Fastify Storage Kit - Unified storage instance with plugin and service methods.
 *
 * @example
 * ```typescript
 * // store-kit.ts - Centralized initialization
 * import { createStorageKit } from "@storage-kit/fastify";
 *
 * export const storeKit = createStorageKit({
 *   provider: "minio",
 *   endpoint: "http://localhost:9000",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 *   defaultBucket: "my-bucket",
 * });
 *
 * // index.ts - Use as Fastify plugin
 * import Fastify from "fastify";
 * import { storeKit } from "./store-kit";
 *
 * const fastify = Fastify();
 * fastify.register(storeKit.plugin(), { prefix: "/api/storage" });
 *
 * // Use as service
 * const result = await storeKit.getPresignedUploadUrl("_", "files/image.png");
 * ```
 */
export class FastifyStorageKit implements IFastifyStorageKitService {
  private readonly _storage: IStorageService;
  private readonly _config: FastifyStorageKitConfig;
  private readonly swaggerConfig: Required<SwaggerOptions>;

  constructor(config: FastifyStorageKitConfig) {
    this._config = config;
    this.swaggerConfig = normalizeSwaggerConfig(config.swagger);

    // Create storage service from config or use provided instance
    this._storage =
      config.storage ??
      createStorageService(config.provider, {
        endpoint: config.endpoint,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        publicUrlBase: config.publicUrlBase,
      });
  }

  get storage(): IStorageService {
    return this._storage;
  }

  get config(): FastifyStorageKitConfig {
    return this._config;
  }

  /**
   * Resolve bucket name ("_" means use defaultBucket).
   */
  private resolveBucket(bucket: string): string {
    if (bucket === "_" && this._config.defaultBucket) {
      return this._config.defaultBucket;
    }
    if (bucket === "_" && !this._config.defaultBucket) {
      throw new StorageError(
        "MISSING_REQUIRED_PARAM",
        "Bucket parameter is '_' but no defaultBucket is configured",
        { parameter: "bucket" }
      );
    }
    return bucket;
  }

  async uploadFile(
    bucket: string,
    file: Buffer | Uint8Array,
    fileName: string,
    pathFolder?: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    const result = await this._storage
      .getBucket(resolvedBucket)
      .uploadFile(file, fileName, pathFolder, options);

    if (this._config.onUploadComplete) {
      this._config.onUploadComplete({
        url: result.url,
        key: result.key,
        bucket: resolvedBucket,
      });
    }

    return result;
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    const resolvedBucket = this.resolveBucket(bucket);
    await this._storage.getBucket(resolvedBucket).deleteFile(key);
  }

  async deleteFiles(
    bucket: string,
    keys: string[]
  ): Promise<BulkDeleteResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    return await this._storage.getBucket(resolvedBucket).deleteFiles(keys);
  }

  async getPresignedUploadUrl(
    bucket: string,
    key: string,
    options?: SignedUrlOptions
  ): Promise<SignedUrlResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    return await this._storage
      .getBucket(resolvedBucket)
      .getPresignedUploadUrl(key, options);
  }

  async getPresignedDownloadUrl(
    bucket: string,
    key: string,
    options?: Pick<SignedUrlOptions, "expiresIn">
  ): Promise<SignedUrlResponse> {
    const resolvedBucket = this.resolveBucket(bucket);
    return await this._storage
      .getBucket(resolvedBucket)
      .getPresignedDownloadUrl(key, options);
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return await this._storage.healthCheck();
  }

  bucket(bucketName: string): IStorageService {
    const resolvedBucket = this.resolveBucket(bucketName);
    return this._storage.getBucket(resolvedBucket);
  }

  /**
   * Get the Fastify plugin for registering routes.
   *
   * @returns Fastify plugin function
   *
   * @example
   * ```typescript
   * fastify.register(storeKit.plugin(), { prefix: "/api/storage" });
   * ```
   */
  plugin(): FastifyPluginAsync<{ prefix?: string }> {
    const storage = this._storage;
    const config = this._config;
    const swaggerConfig = this.swaggerConfig;

    const pluginFn: FastifyPluginAsync<{ prefix?: string }> = async (
      fastify: FastifyInstance,
      _opts: { prefix?: string }
    ) => {
      // Register multipart plugin
      await fastify.register(import("@fastify/multipart"), {
        limits: {
          fileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
        },
      });

      // Swagger UI Setup
      if (swaggerConfig.enabled) {
        const openApiSpec = loadOpenApiSpec();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await fastify.register(import("@fastify/swagger"), {
          mode: "static",
          specification: {
            document: openApiSpec,
          },
        } as any);

        await fastify.register(import("@fastify/swagger-ui"), {
          routePrefix: swaggerConfig.path,
          uiConfig: {
            docExpansion: "list",
            deepLinking: true,
            displayRequestDuration: true,
            persistAuthorization: true,
          },
          staticCSP: true,
          transformSpecificationClone: true,
        });
      }

      // Create handler instance
      const handler = new StorageHandler(storage, config);

      // Error Handler
      fastify.setErrorHandler(
        (error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
          if (config.onError && error instanceof Error) {
            config.onError(error);
          }
          const { status, body } = mapAnyErrorToResponse(error);
          reply.status(status).send(body);
        }
      );

      // Health Check
      fastify.get(
        "/health",
        async (_request: FastifyRequest, reply: FastifyReply) => {
          const result = await handler.handleHealthCheck();
          const status = result.status === "healthy" ? 200 : 503;
          reply.status(status).send(result);
        }
      );

      // Upload File
      fastify.post<{ Params: { bucket: string } }>(
        "/:bucket/files",
        async (
          request: FastifyRequest<{ Params: { bucket: string } }>,
          reply: FastifyReply
        ) => {
          const { bucket } = request.params;
          const data = await request.file();

          let file: UploadedFile | undefined;
          let path: string | undefined;
          let contentType: string | undefined;

          if (data) {
            const chunks: Buffer[] = [];
            for await (const chunk of data.file) {
              chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            file = {
              buffer,
              originalName: data.filename,
              mimeType: data.mimetype,
              size: buffer.length,
            };

            if (data.fields) {
              const pathField = data.fields["path"] as
                | { value?: string }
                | undefined;
              const contentTypeField = data.fields["contentType"] as
                | { value?: string }
                | undefined;
              path = pathField?.value;
              contentType = contentTypeField?.value;
            }
          }

          const result = await handler.handleUpload(
            bucket,
            file,
            path,
            contentType
          );
          reply.status(201).send(result);
        }
      );

      // Delete Single File
      fastify.delete<{ Params: { bucket: string; filePath: string } }>(
        "/:bucket/files/:filePath",
        async (
          request: FastifyRequest<{
            Params: { bucket: string; filePath: string };
          }>,
          reply: FastifyReply
        ) => {
          const { bucket, filePath } = request.params;
          const decodedPath = decodeURIComponent(filePath);
          await handler.handleDelete(bucket, decodedPath);
          reply.status(204).send();
        }
      );

      // Bulk Delete Files
      fastify.delete<{ Params: { bucket: string }; Body: { keys?: string[] } }>(
        "/:bucket/files",
        async (
          request: FastifyRequest<{
            Params: { bucket: string };
            Body: { keys?: string[] };
          }>,
          reply: FastifyReply
        ) => {
          const { bucket } = request.params;
          const { keys } = request.body || {};
          const result = await handler.handleBulkDelete(bucket, keys);
          reply.status(200).send(result);
        }
      );

      // Signed URL Generation
      fastify.get<{
        Params: { bucket: string };
        Querystring: {
          key?: string;
          type?: string;
          expiresIn?: string;
          contentType?: string;
        };
      }>(
        "/:bucket/signed-url",
        async (
          request: FastifyRequest<{
            Params: { bucket: string };
            Querystring: {
              key?: string;
              type?: string;
              expiresIn?: string;
              contentType?: string;
            };
          }>,
          reply: FastifyReply
        ) => {
          const { bucket } = request.params;
          const { key, type, expiresIn, contentType } = request.query;

          const result = await handler.handleSignedUrl(bucket, key, type, {
            expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
            contentType,
          });

          reply.status(200).send({
            ...result,
            expiresAt: result.expiresAt.toISOString(),
          });
        }
      );
    };

    return pluginFn;
  }
}

/**
 * Create a Storage Kit instance for Fastify.
 *
 * @param config - Storage Kit configuration
 * @returns FastifyStorageKit instance
 *
 * @example
 * ```typescript
 * // store-kit.ts
 * import { createStorageKit } from "@storage-kit/fastify";
 *
 * export const storeKit = createStorageKit({
 *   provider: "minio",
 *   endpoint: "http://localhost:9000",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 *   defaultBucket: "my-bucket",
 * });
 *
 * // index.ts
 * import Fastify from "fastify";
 * import { storeKit } from "./store-kit";
 *
 * const fastify = Fastify();
 * fastify.register(storeKit.plugin(), { prefix: "/api/storage" });
 *
 * // Use as service
 * const url = await storeKit.getPresignedUploadUrl("_", "file.png");
 * ```
 */
export function createStorageKit(
  config: FastifyStorageKitConfig
): FastifyStorageKit {
  return new FastifyStorageKit(config);
}

/**
 * Fastify plugin for Storage Kit.
 *
 * @deprecated Use `createStorageKit(config).plugin()` instead for unified API.
 *
 * @example
 * ```typescript
 * import Fastify from "fastify";
 * import { storageKitPlugin } from "@storage-kit/fastify";
 *
 * const fastify = Fastify();
 *
 * fastify.register(storageKitPlugin, {
 *   prefix: "/api/storage",
 *   provider: "minio",
 *   endpoint: "http://localhost:9000",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 * });
 * ```
 */
export const storageKitPlugin: FastifyPluginAsync<
  FastifyStorageKitConfig
> = async (fastify: FastifyInstance, config: FastifyStorageKitConfig) => {
  const kit = new FastifyStorageKit(config);
  const plugin = kit.plugin();
  await plugin(fastify, {});
};

/**
 * Create a standalone error handler for StorageError.
 */
export function createStorageErrorHandler() {
  return (error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof StorageError) {
      const { status, body } = mapAnyErrorToResponse(error);
      reply.status(status).send(body);
    } else {
      throw error;
    }
  };
}
