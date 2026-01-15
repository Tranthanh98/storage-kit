/**
 * Express Adapter for Storage Kit
 *
 * Provides plug-and-play Express router for storage operations.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { parse } from "yaml";
import { dirname, resolve } from "path";
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
 * Express-specific configuration options.
 */
export interface ExpressStorageKitConfig extends StorageKitConfig {
  /** Custom storage service instance (overrides provider config) */
  storage?: IStorageService;
  /** Enable Swagger UI at /reference (default: true) */
  swagger?: boolean | SwaggerOptions;
}

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
 * Convert multer file to normalized UploadedFile interface.
 */
function multerToUploadedFile(file: Express.Multer.File): UploadedFile {
  return {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

/**
 * Load and customize OpenAPI spec for Swagger UI.
 */
function loadOpenApiSpec(basePath: string): object {
  try {
    // Resolve the @storage-kit/core package directory
    const corePkgPath = require.resolve("@storage-kit/core/package.json");
    const coreDir = dirname(corePkgPath);
    const specPath = resolve(coreDir, "openapi", "storage-api.yaml");
    const specContent = readFileSync(specPath, "utf8");
    const spec = parse(specContent) as Record<string, unknown>;

    // Update servers to point to the mounted path
    spec.servers = [
      {
        url: basePath,
        description: "Storage Kit API",
      },
    ];

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
 * Create an Express Router with Storage Kit endpoints.
 *
 * The router implements all endpoints defined in the OpenAPI specification:
 * - GET /reference - Swagger UI (API documentation)
 * - POST /:bucket/files - Upload file
 * - DELETE /:bucket/files/:filePath - Delete single file
 * - DELETE /:bucket/files - Bulk delete files
 * - GET /:bucket/signed-url - Generate signed URL
 * - GET /health - Health check
 *
 * @param config - Storage Kit configuration
 * @returns Express Router instance
 *
 * @example
 * ```typescript
 * import express from "express";
 * import { storageKit } from "@storage-kit/express";
 *
 * const app = express();
 *
 * app.use("/api/storage", storageKit({
 *   provider: "minio",
 *   endpoint: "http://localhost:9000",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 * }));
 *
 * // Swagger UI available at: http://localhost:3000/api/storage/reference
 * app.listen(3000);
 * ```
 */
export function storageKit(config: ExpressStorageKitConfig): Router {
  const router = Router();

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

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE,
    },
  });

  // ========================================
  // Swagger UI (API Reference)
  // ========================================
  const swaggerConfig = normalizeSwaggerConfig(config.swagger);
  
  if (swaggerConfig.enabled) {
    // We need to defer spec loading to capture the mount path
    // Use a middleware that serves swagger on first request
    let swaggerMiddleware: ReturnType<typeof swaggerUi.setup> | null = null;
    let swaggerSpec: object | null = null;

    router.use(
      swaggerConfig.path,
      swaggerUi.serve,
      (req: Request, res: Response, next: NextFunction) => {
        if (!swaggerMiddleware) {
          // Determine the base path from the request
          const basePath = req.baseUrl || "";
          swaggerSpec = loadOpenApiSpec(basePath);
          swaggerMiddleware = swaggerUi.setup(swaggerSpec, {
            customSiteTitle: swaggerConfig.title || "Storage Kit API Reference",
            customCss: `
              .swagger-ui .topbar { display: none }
              .swagger-ui .info .title { font-size: 2rem }
            `,
            swaggerOptions: {
              persistAuthorization: true,
              displayRequestDuration: true,
            },
          });
        }
        swaggerMiddleware(req, res, next);
      }
    );
  }

  // ========================================
  // Health Check
  // ========================================
  router.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler.handleHealthCheck();
      const status = result.status === "healthy" ? 200 : 503;
      res.status(status).json(result);
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // Upload File
  // ========================================
  router.post(
    "/:bucket/files",
    upload.single("file"),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { bucket } = req.params;
        const { path, contentType } = req.body;

        const file = req.file ? multerToUploadedFile(req.file) : undefined;

        const result = await handler.handleUpload(bucket, file, path, contentType);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // ========================================
  // Delete Single File
  // ========================================
  router.delete(
    "/:bucket/files/:filePath(*)",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { bucket, filePath } = req.params;

        // URL decode the file path
        const decodedPath = decodeURIComponent(filePath);

        await handler.handleDelete(bucket, decodedPath);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  // ========================================
  // Bulk Delete Files
  // ========================================
  router.delete(
    "/:bucket/files",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { bucket } = req.params;
        const { keys } = req.body;

        const result = await handler.handleBulkDelete(bucket, keys);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // ========================================
  // Signed URL Generation
  // ========================================
  router.get(
    "/:bucket/signed-url",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { bucket } = req.params;
        const { key, type, expiresIn, contentType } = req.query;

        const result = await handler.handleSignedUrl(
          bucket,
          key as string | undefined,
          type as string | undefined,
          {
            expiresIn: expiresIn ? parseInt(expiresIn as string, 10) : undefined,
            contentType: contentType as string | undefined,
          }
        );

        // Convert Date to ISO string for JSON response
        res.status(200).json({
          ...result,
          expiresAt: result.expiresAt.toISOString(),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // ========================================
  // Error Handling Middleware
  // ========================================
  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Call error hook if configured
    if (config.onError && error instanceof Error) {
      config.onError(error);
    }

    const { status, body } = mapAnyErrorToResponse(error);
    res.status(status).json(body);
  });

  return router;
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
 * Express error handler middleware for StorageError.
 * Use this if you need to handle storage errors at app level.
 *
 * @example
 * ```typescript
 * import { storageErrorHandler } from "@storage-kit/express";
 *
 * app.use(storageErrorHandler());
 * ```
 */
export function storageErrorHandler() {
  return (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof StorageError) {
      const { status, body } = mapAnyErrorToResponse(error);
      res.status(status).json(body);
    } else {
      next(error);
    }
  };
}
