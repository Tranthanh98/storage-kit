/**
 * Storage Kit Example Server
 *
 * A ready-to-run Express.js server demonstrating Storage Kit with built-in Swagger UI.
 * Access the API documentation at: http://localhost:3000/api/storage/reference
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { storageKit } from "@storage-kit/express";

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
app.use(
  "/api/storage",
  storageKit({
    provider: "minio",
    endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
    accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    // Swagger UI is enabled by default at /reference
    // To customize: swagger: { path: "/docs", title: "My API" }
    // To disable: swagger: false
  })
);

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
      signedUrl: "GET /api/storage/{bucket}/signed-url?key=...&type=upload|download",
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
|  Make sure MinIO is running:                                      |
|    docker-compose up -d                                           |
|                                                                   |
|  MinIO Console:        http://localhost:9001                      |
|  (Login: minioadmin / minioadmin)                                 |
|                                                                   |
+------------------------------------------------------------------+
  `);
});
