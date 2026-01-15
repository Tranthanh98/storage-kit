# @storage-kit/express

Express.js adapter for Storage Kit - plug-and-play storage HTTP endpoints.

## Installation

```bash
npm install @storage-kit/express @storage-kit/core express
# or
pnpm add @storage-kit/express @storage-kit/core express
```

## Quick Start

```typescript
import express from "express";
import { storageKit } from "@storage-kit/express";

const app = express();

// Add JSON body parsing for bulk delete
app.use(express.json());

// Mount storage endpoints
app.use("/api/storage", storageKit({
  provider: "minio",
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
}));

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
  console.log("API Reference: http://localhost:3000/api/storage/reference");
});
```

**Swagger UI** is automatically available at `/api/storage/reference` - no additional setup required!

## Endpoints

The adapter implements all endpoints defined in the OpenAPI specification:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:bucket/files` | Upload a file |
| `DELETE` | `/:bucket/files/:filePath` | Delete a single file |
| `DELETE` | `/:bucket/files` | Bulk delete files |
| `GET` | `/:bucket/signed-url` | Generate signed URL |
| `GET` | `/health` | Health check |

## Built-in Swagger UI

The adapter includes a built-in interactive API reference powered by Swagger UI. By default, it's available at the `/reference` path relative to your mount point.

### Default Behavior

```typescript
app.use("/api/storage", storageKit({
  provider: "minio",
  // ... credentials
}));
// Swagger UI available at: /api/storage/reference
```

### Customizing Swagger UI

```typescript
app.use("/api/storage", storageKit({
  provider: "minio",
  // ... credentials
  swagger: {
    enabled: true,
    path: "/docs",           // Custom path (default: "/reference")
    title: "My Storage API", // Custom page title
  }
}));
// Swagger UI available at: /api/storage/docs
```

### Disabling Swagger UI

```typescript
app.use("/api/storage", storageKit({
  provider: "minio",
  // ... credentials
  swagger: false,  // Disable Swagger UI entirely
}));
```

## Configuration

```typescript
interface ExpressStorageKitConfig {
  // Required
  provider: "minio" | "backblaze" | "cloudflare-r2";

  // Provider credentials
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  publicUrlBase?: string;

  // Adapter options
  defaultBucket?: string;    // Default bucket when using "_" placeholder
  maxFileSize?: number;      // Max file size in bytes (default: 10MB)
  allowedMimeTypes?: string[]; // e.g., ["image/*", "application/pdf"]

  // Swagger UI options
  swagger?: boolean | {
    enabled?: boolean;       // Enable/disable (default: true)
    path?: string;           // URL path (default: "/reference")
    title?: string;          // Page title
  };

  // Hooks
  onUploadComplete?: (result) => void;
  onError?: (error) => void;

  // Custom storage instance
  storage?: IStorageService;
}
```

## Usage Examples

### File Upload

```bash
curl -X POST http://localhost:3000/api/storage/my-bucket/files \
  -F "file=@/path/to/image.png" \
  -F "path=avatars/user123"
```

### Delete File

```bash
curl -X DELETE http://localhost:3000/api/storage/my-bucket/files/avatars%2Fuser123%2Fimage.png
```

### Generate Signed URL

```bash
curl "http://localhost:3000/api/storage/my-bucket/signed-url?key=file.png&type=upload"
```

## Error Handling

The adapter automatically converts `StorageError` to HTTP responses. You can also use the standalone error handler:

```typescript
import { storageErrorHandler } from "@storage-kit/express";

// Apply after your routes
app.use(storageErrorHandler());
```

## License

MIT
