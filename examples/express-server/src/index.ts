/**
 * Storage Kit Example Server
 *
 * A ready-to-run Express.js server demonstrating Storage Kit with built-in Swagger UI.
 * Access the API documentation at: http://localhost:3000/api/storage/reference
 */

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { storeKit } from "./store-kit";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// Storage Kit API at /api/storage
// Swagger UI is automatically available at /api/storage/reference
// ============================================
app.use("/api/storage", storeKit.routeHandler());

// ============================================
// Example: Using Storage Kit as a service
// ============================================
app.get("/example/presigned-url", async (req, res) => {
  try {
    // Using storeKit as a service - no HTTP involved
    // "_" means use the defaultBucket configured above
    const result = await storeKit.getPresignedUploadUrl(
      "_",
      "uploads/example.png",
      {
        contentType: "image/png",
        expiresIn: 3600, // 1 hour
      }
    );
    res.json({
      message: "Presigned URL generated using storeKit service",
      result: {
        signedUrl: result.signedUrl,
        publicUrl: result.publicUrl,
        expiresAt: result.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Example: Direct service usage for health check
app.get("/example/health", async (_req, res) => {
  try {
    const health = await storeKit.healthCheck();
    res.json({
      message: "Health check using storeKit service",
      result: health,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================
// Root endpoint with links
// ============================================
app.get("/", (_req, res) => {
  res.json({
    name: "Storage Kit Example Server",
    version: "1.0.0",
    links: {
      apiReference: "/api/storage/reference",
      healthCheck: "/api/storage/health",
    },
    usage: {
      uploadFile: "POST /api/storage/{bucket}/files",
      deleteFile: "DELETE /api/storage/{bucket}/files/{filePath}",
      bulkDelete: "DELETE /api/storage/{bucket}/files",
      signedUrl:
        "GET /api/storage/{bucket}/signed-url?key=...&type=upload|download",
    },
    examples: {
      presignedUrl: "/example/presigned-url",
      health: "/example/health",
    },
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log(`
+------------------------------------------------------------------+
|                  Storage Kit Example Server                       |
+------------------------------------------------------------------+
|                                                                   |
|  Server running at:    http://localhost:${PORT}                      |
|  API Reference:        http://localhost:${PORT}/api/storage/reference|
|  Health Check:         http://localhost:${PORT}/api/storage/health   |
|                                                                   |
|  Example endpoints (using storeKit as service):                   |
|    - GET /example/presigned-url                                   |
|    - GET /example/health                                          |
|                                                                   |
|  Make sure MinIO is running:                                      |
|    docker-compose up -d                                           |
|                                                                   |
|  MinIO Console:        http://localhost:9001                      |
|  (Login: minioadmin / minioadmin)                                 |
|                                                                   |
+------------------------------------------------------------------+
  `);
});
