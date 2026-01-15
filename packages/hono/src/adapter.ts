/**
 * Hono Adapter for Storage Kit
 *
 * Provides plug-and-play Hono app for storage operations.
 * Edge-runtime compatible (Cloudflare Workers, Deno, Bun).
 */

import { swaggerUI } from "@hono/swagger-ui";
import {
  BaseStorageKit,
  mapAnyErrorToResponse,
  StorageError,
  StorageHandler,
  type IStorageService,
  type IStorageKitService,
  type StorageKitConfig,
  type UploadedFile,
} from "@storage-kit/core";
import { Hono, type Context } from "hono";

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
 * Hono-specific configuration options.
 */
export type HonoStorageKitConfig = StorageKitConfig & {
  /** Custom storage service instance (overrides provider config) */
  storage?: IStorageService;
  /** Enable Swagger UI at /reference (default: true) */
  swagger?: boolean | SwaggerOptions;
};

/**
 * Convert Hono File to normalized UploadedFile interface.
 */
async function honoFileToUploadedFile(file: File): Promise<UploadedFile> {
  const arrayBuffer = await file.arrayBuffer();
  return {
    buffer: new Uint8Array(arrayBuffer),
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
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
 * Create an embedded OpenAPI spec for edge environments.
 * Since we can't use fs in edge runtimes, we embed a minimal spec.
 */
function getEmbeddedOpenApiSpec(): object {
  return {
    openapi: "3.0.3",
    info: {
      title: "Storage Kit API",
      version: "1.0.0",
      description: "S3-compatible storage operations API",
    },
    paths: {
      "/health": {
        get: {
          summary: "Health Check",
          operationId: "healthCheck",
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: {
                        type: "string",
                        enum: ["healthy", "unhealthy"],
                      },
                      provider: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/{bucket}/files": {
        post: {
          summary: "Upload File",
          operationId: "uploadFile",
          parameters: [
            {
              name: "bucket",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    file: { type: "string", format: "binary" },
                    path: { type: "string" },
                    contentType: { type: "string" },
                  },
                  required: ["file"],
                },
              },
            },
          },
          responses: {
            "201": { description: "File uploaded successfully" },
          },
        },
        delete: {
          summary: "Bulk Delete Files",
          operationId: "bulkDeleteFiles",
          parameters: [
            {
              name: "bucket",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    keys: { type: "array", items: { type: "string" } },
                  },
                  required: ["keys"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Files deleted successfully" },
          },
        },
      },
      "/{bucket}/files/{filePath}": {
        delete: {
          summary: "Delete File",
          operationId: "deleteFile",
          parameters: [
            {
              name: "bucket",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "filePath",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "204": { description: "File deleted successfully" },
          },
        },
      },
      "/{bucket}/signed-url": {
        get: {
          summary: "Generate Signed URL",
          operationId: "getSignedUrl",
          parameters: [
            {
              name: "bucket",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "key",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "type",
              in: "query",
              required: true,
              schema: { type: "string", enum: ["upload", "download"] },
            },
            { name: "expiresIn", in: "query", schema: { type: "integer" } },
            { name: "contentType", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Signed URL generated" },
          },
        },
      },
    },
  };
}

/**
 * Service interface for Hono Storage Kit.
 */
export interface IHonoStorageKitService extends IStorageKitService {
  /** Get route handler */
  routeHandler(): Hono;
}

/**
 * Hono Storage Kit - Unified storage instance with route handler and service methods.
 *
 * Extends BaseStorageKit to inherit multi-provider support.
 *
 * @example
 * ```typescript
 * // store-kit.ts - Centralized initialization
 * import { createStorageKit } from "@storage-kit/hono";
 *
 * export const storeKit = createStorageKit({
 *   provider: "cloudflare-r2",
 *   endpoint: "https://account.r2.cloudflarestorage.com",
 *   accessKeyId: "key",
 *   secretAccessKey: "secret",
 *   defaultBucket: "my-bucket",
 * });
 *
 * // index.ts - Use as route handler
 * import { storeKit } from "./store-kit";
 * app.route("/api/storage", storeKit.routeHandler());
 *
 * // Use as service
 * const result = await storeKit.getPresignedUploadUrl("_", "files/image.png");
 *
 * // Multi-provider usage
 * await storeKit.useProvider("minio").bucket("images").deleteFile("photo.jpg");
 * ```
 */
export class HonoStorageKit
  extends BaseStorageKit
  implements IHonoStorageKitService
{
  private readonly swaggerConfig: Required<SwaggerOptions>;
  private cachedApp: Hono | null = null;

  constructor(config: HonoStorageKitConfig) {
    super(config);
    this.swaggerConfig = normalizeSwaggerConfig(
      (config as HonoStorageKitConfig).swagger
    );
  }

  /**
   * Get the Hono-specific configuration.
   */
  get honoConfig(): HonoStorageKitConfig {
    return this._config as HonoStorageKitConfig;
  }

  /**
   * Create a Hono app with Storage Kit endpoints.
   */
  routeHandler(): Hono {
    if (this.cachedApp) {
      return this.cachedApp;
    }

    const app = new Hono();
    const config = this.honoConfig;
    const handler = new StorageHandler(this._storage, config);

    // Error Handling
    app.onError((error: Error, c: Context) => {
      if (config.onError) {
        config.onError(error);
      }
      const { status, body } = mapAnyErrorToResponse(error);
      return c.json(body, status as 400 | 404 | 500 | 503);
    });

    // Swagger UI
    if (this.swaggerConfig.enabled) {
      const openApiSpec = getEmbeddedOpenApiSpec();
      app.get("/openapi.json", (c: Context) => c.json(openApiSpec));
      app.get(this.swaggerConfig.path, swaggerUI({ url: "./openapi.json" }));
    }

    // Health Check
    app.get("/health", async (c: Context) => {
      const result = await handler.handleHealthCheck();
      const status = result.status === "healthy" ? 200 : 503;
      return c.json(result, status as 200 | 503);
    });

    // Upload File
    app.post("/:bucket/files", async (c: Context) => {
      const bucket = c.req.param("bucket");
      const formData = await c.req.parseBody();
      const fileData = formData["file"];
      let file: UploadedFile | undefined;

      if (fileData && fileData instanceof File) {
        file = await honoFileToUploadedFile(fileData);
      }

      const path =
        typeof formData["path"] === "string" ? formData["path"] : undefined;
      const contentType =
        typeof formData["contentType"] === "string"
          ? formData["contentType"]
          : undefined;

      const result = await handler.handleUpload(
        bucket,
        file,
        path,
        contentType
      );
      return c.json(result, 201);
    });

    // Delete Single File
    app.delete("/:bucket/files/:filePath{.+}", async (c: Context) => {
      const bucket = c.req.param("bucket");
      const filePath = c.req.param("filePath");
      const decodedPath = decodeURIComponent(filePath);
      await handler.handleDelete(bucket, decodedPath);
      return c.body(null, 204);
    });

    // Bulk Delete Files
    app.delete("/:bucket/files", async (c: Context) => {
      const bucket = c.req.param("bucket");
      const body = await c.req.json<{ keys?: string[] }>();
      const result = await handler.handleBulkDelete(bucket, body?.keys);
      return c.json(result, 200);
    });

    // Signed URL Generation
    app.get("/:bucket/signed-url", async (c: Context) => {
      const bucket = c.req.param("bucket");
      const key = c.req.query("key");
      const type = c.req.query("type");
      const expiresIn = c.req.query("expiresIn");
      const contentType = c.req.query("contentType");

      const result = await handler.handleSignedUrl(bucket, key, type, {
        expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
        contentType,
      });

      return c.json(
        { ...result, expiresAt: result.expiresAt.toISOString() },
        200
      );
    });

    this.cachedApp = app;
    return app;
  }
}

/**
 * Create a Storage Kit instance for Hono.
 *
 * @param config - Storage Kit configuration
 * @returns HonoStorageKit instance
 *
 * @example
 * ```typescript
 * // store-kit.ts
 * import { createStorageKit } from "@storage-kit/hono";
 *
 * export const storeKit = createStorageKit({
 *   provider: "cloudflare-r2",
 *   endpoint: "https://account.r2.cloudflarestorage.com",
 *   accessKeyId: "key",
 *   secretAccessKey: "secret",
 *   defaultBucket: "my-bucket",
 * });
 *
 * // index.ts
 * import { Hono } from "hono";
 * import { storeKit } from "./store-kit";
 *
 * const app = new Hono();
 * app.route("/api/storage", storeKit.routeHandler());
 *
 * // Use as service
 * const url = await storeKit.getPresignedUploadUrl("_", "file.png");
 * ```
 */
export function createStorageKit(config: HonoStorageKitConfig): HonoStorageKit {
  return new HonoStorageKit(config);
}

/**
 * Create a Hono app with Storage Kit endpoints.
 *
 * @deprecated Use `createStorageKit(config).routeHandler()` instead for unified API.
 *
 * @param config - Storage Kit configuration
 * @returns Hono app instance
 */
export function storageKit(config: HonoStorageKitConfig): Hono {
  return new HonoStorageKit(config).routeHandler();
}

/**
 * Middleware for handling StorageError in Hono apps.
 */
export function storageErrorMiddleware() {
  return async (
    c: Context,
    next: () => Promise<void>
  ): Promise<void | Response> => {
    try {
      await next();
    } catch (error) {
      if (error instanceof StorageError) {
        const { status, body } = mapAnyErrorToResponse(error);
        return c.json(body, status as 400 | 404 | 500 | 503);
      }
      throw error;
    }
  };
}
