/**
 * Fastify Adapter for Storage Kit
 *
 * Provides plug-and-play Fastify plugin for storage operations.
 */

import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { parse } from "yaml";
import {
  createStorageService,
  StorageHandler,
  mapAnyErrorToResponse,
  type StorageKitConfig,
  type UploadedFile,
  type IStorageService,
  StorageError,
  DEFAULT_MAX_FILE_SIZE,
} from "@storage-kit/core";

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
function normalizeSwaggerConfig(swagger?: boolean | SwaggerOptions): Required<SwaggerOptions> {
  if (swagger === false) {
    return { enabled: false, path: "/reference", title: "Storage Kit API Reference" };
  }
  if (swagger === true || swagger === undefined) {
    return { enabled: true, path: "/reference", title: "Storage Kit API Reference" };
  }
  return {
    enabled: swagger.enabled !== false,
    path: swagger.path || "/reference",
    title: swagger.title || "Storage Kit API Reference",
  };
}

/**
 * Fastify plugin for Storage Kit.
 *
 * Implements all endpoints defined in the OpenAPI specification:
 * - GET /reference - Swagger UI (API documentation)
 * - POST /:bucket/files - Upload file
 * - DELETE /:bucket/files/:filePath - Delete single file
 * - DELETE /:bucket/files - Bulk delete files
 * - GET /:bucket/signed-url - Generate signed URL
 * - GET /health - Health check
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
 *
 * // Swagger UI available at: http://localhost:3000/api/storage/reference
 * fastify.listen({ port: 3000 });
 * ```
 */
export const storageKitPlugin: FastifyPluginAsync<FastifyStorageKitConfig> = async (
  fastify: FastifyInstance,
  config: FastifyStorageKitConfig
) => {
  // Register multipart plugin
  await fastify.register(import("@fastify/multipart"), {
    limits: {
      fileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    },
  });

  // ========================================
  // Swagger UI Setup
  // ========================================
  const swaggerConfig = normalizeSwaggerConfig(config.swagger);

  if (swaggerConfig.enabled) {
    const openApiSpec = loadOpenApiSpec();

    // Register @fastify/swagger for spec serving
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fastify.register(import("@fastify/swagger"), {
      mode: "static",
      specification: {
        document: openApiSpec,
      },
    } as any);

    // Register @fastify/swagger-ui for UI
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

  // Create storage service from config or use provided instance
  const storage =
    config.storage ??
    createStorageService(config.provider, {
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      publicUrlBase: config.publicUrlBase,
    });

  // Create handler instance
  const handler = new StorageHandler(storage, config);

  // ========================================
  // Error Handler
  // ========================================
  fastify.setErrorHandler((error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    // Call error hook if configured
    if (config.onError && error instanceof Error) {
      config.onError(error);
    }

    const { status, body } = mapAnyErrorToResponse(error);
    reply.status(status).send(body);
  });

  // ========================================
  // Health Check
  // ========================================
  fastify.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await handler.handleHealthCheck();
    const status = result.status === "healthy" ? 200 : 503;
    reply.status(status).send(result);
  });

  // ========================================
  // Upload File
  // ========================================
  fastify.post<{
    Params: { bucket: string };
  }>("/:bucket/files", async (request: FastifyRequest<{ Params: { bucket: string } }>, reply: FastifyReply) => {
    const { bucket } = request.params;

    // Parse multipart data
    const data = await request.file();

    let file: UploadedFile | undefined;
    let path: string | undefined;
    let contentType: string | undefined;

    if (data) {
      // Buffer the file
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

      // Extract fields from multipart
      if (data.fields) {
        const pathField = data.fields["path"] as { value?: string } | undefined;
        const contentTypeField = data.fields["contentType"] as { value?: string } | undefined;
        path = pathField?.value;
        contentType = contentTypeField?.value;
      }
    }

    const result = await handler.handleUpload(bucket, file, path, contentType);
    reply.status(201).send(result);
  });

  // ========================================
  // Delete Single File
  // ========================================
  fastify.delete<{
    Params: { bucket: string; filePath: string };
  }>("/:bucket/files/:filePath", async (request: FastifyRequest<{ Params: { bucket: string; filePath: string } }>, reply: FastifyReply) => {
    const { bucket, filePath } = request.params;

    // URL decode the file path
    const decodedPath = decodeURIComponent(filePath);

    await handler.handleDelete(bucket, decodedPath);
    reply.status(204).send();
  });

  // ========================================
  // Bulk Delete Files
  // ========================================
  fastify.delete<{
    Params: { bucket: string };
    Body: { keys?: string[] };
  }>("/:bucket/files", async (request: FastifyRequest<{ Params: { bucket: string }; Body: { keys?: string[] } }>, reply: FastifyReply) => {
    const { bucket } = request.params;
    const { keys } = request.body || {};

    const result = await handler.handleBulkDelete(bucket, keys);
    reply.status(200).send(result);
  });

  // ========================================
  // Signed URL Generation
  // ========================================
  fastify.get<{
    Params: { bucket: string };
    Querystring: {
      key?: string;
      type?: string;
      expiresIn?: string;
      contentType?: string;
    };
  }>("/:bucket/signed-url", async (request: FastifyRequest<{
    Params: { bucket: string };
    Querystring: { key?: string; type?: string; expiresIn?: string; contentType?: string };
  }>, reply: FastifyReply) => {
    const { bucket } = request.params;
    const { key, type, expiresIn, contentType } = request.query;

    const result = await handler.handleSignedUrl(bucket, key, type, {
      expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
      contentType,
    });

    // Convert Date to ISO string for JSON response
    reply.status(200).send({
      ...result,
      expiresAt: result.expiresAt.toISOString(),
    });
  });
};

/**
 * Create a standalone error handler for StorageError.
 * Use this if you need to handle storage errors at app level.
 */
export function createStorageErrorHandler() {
  return (error: unknown, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof StorageError) {
      const { status, body } = mapAnyErrorToResponse(error);
      reply.status(status).send(body);
    } else {
      // Re-throw for default handler
      throw error;
    }
  };
}
