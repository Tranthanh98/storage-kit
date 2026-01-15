/**
 * Storage Kit - Centralized Initialization Example
 *
 * This file demonstrates the recommended pattern: centralized initialization.
 * Create your storeKit instance here and export it for use throughout your app.
 *
 * @example
 * ```typescript
 * // In your route handlers or services:
 * import { storeKit } from "./store-kit";
 *
 * // Use as route handler
 * app.use("/api/storage", storeKit.routeHandler());
 *
 * // Use as service
 * const result = await storeKit.getPresignedUploadUrl("_", "path/to/file.png");
 * ```
 */

import {
  createStorageKit,
  type ExpressStorageKitConfig,
} from "@storage-kit/express";

/**
 * Configuration for Storage Kit.
 * Customize these values based on your environment.
 */
const config: ExpressStorageKitConfig = {
  // Required: Storage provider type
  provider: "minio",

  // Provider credentials
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",

  // Optional: Default bucket for convenience
  // When using "_" as bucket parameter, this bucket will be used
  defaultBucket: process.env.DEFAULT_BUCKET || "uploads",

  // Optional: File upload constraints
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/*", "application/pdf", "video/*"],

  // Optional: Swagger UI configuration
  swagger: {
    enabled: true,
    path: "/reference",
    title: "My Storage API",
  },

  // Optional: Hooks for customization
  onUploadComplete: (result) => {
    console.log(`File uploaded: ${result.key} to bucket: ${result.bucket}`);
  },
  onError: (error) => {
    console.error(`Storage error: ${error.message}`);
  },
};

/**
 * The Storage Kit instance.
 *
 * Use this throughout your application:
 *
 * 1. As a route handler:
 *    ```typescript
 *    app.use("/api/storage", storeKit.routeHandler());
 *    ```
 *
 * 2. As a service (direct method calls):
 *    ```typescript
 *    // Upload file programmatically
 *    const result = await storeKit.uploadFile("_", buffer, "avatar.png", "users/123");
 *
 *    // Generate presigned URL
 *    const url = await storeKit.getPresignedUploadUrl("_", "files/doc.pdf", {
 *      contentType: "application/pdf",
 *      expiresIn: 3600,
 *    });
 *
 *    // Delete file
 *    await storeKit.deleteFile("_", "users/123/avatar.png");
 *
 *    // Bulk delete
 *    await storeKit.deleteFiles("_", ["file1.png", "file2.png"]);
 *
 *    // Health check
 *    const health = await storeKit.healthCheck();
 *    ```
 *
 * 3. Get bucket-scoped service:
 *    ```typescript
 *    const avatarStorage = storeKit.bucket("avatars");
 *    await avatarStorage.uploadFile(buffer, "user123.png");
 *    ```
 *
 * 4. Access underlying storage service for advanced operations:
 *    ```typescript
 *    const storageService = storeKit.storage;
 *    ```
 */
export const storeKit = createStorageKit(config);

// Export types for convenience
export type { ExpressStorageKitConfig } from "@storage-kit/express";
