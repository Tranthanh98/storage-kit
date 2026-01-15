# @storage-kit/hono

Hono adapter for Storage Kit - edge-compatible storage HTTP endpoints.

Works with Cloudflare Workers, Deno, Bun, and Node.js.

## Installation

```bash
npm install @storage-kit/hono @storage-kit/core hono
# or
pnpm add @storage-kit/hono @storage-kit/core hono
```

## Quick Start

```typescript
import { Hono } from "hono";
import { storageKit } from "@storage-kit/hono";

const app = new Hono();

// Mount storage endpoints
app.route("/api/storage", storageKit({
  provider: "cloudflare-r2",
  endpoint: "https://account.r2.cloudflarestorage.com",
  accessKeyId: "your-access-key",
  secretAccessKey: "your-secret-key",
}));

export default app;
```

**Swagger UI** is automatically available at `/api/storage/reference` - no additional setup required!

## Cloudflare Workers Example

```typescript
import { Hono } from "hono";
import { storageKit } from "@storage-kit/hono";

const app = new Hono();

app.route("/storage", storageKit({
  provider: "cloudflare-r2",
  endpoint: "https://your-account.r2.cloudflarestorage.com",
  accessKeyId: process.env.R2_ACCESS_KEY,
  secretAccessKey: process.env.R2_SECRET_KEY,
}));

export default app;
```

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
app.route("/api/storage", storageKit({
  provider: "cloudflare-r2",
  // ... credentials
}));
// Swagger UI available at: /api/storage/reference
```

### Customizing Swagger UI

```typescript
app.route("/api/storage", storageKit({
  provider: "cloudflare-r2",
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
app.route("/api/storage", storageKit({
  provider: "cloudflare-r2",
  // ... credentials
  swagger: false,  // Disable Swagger UI entirely
}));
```

## Configuration

```typescript
interface HonoStorageKitConfig {
  // Required
  provider: "minio" | "backblaze" | "cloudflare-r2";

  // Provider credentials
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  publicUrlBase?: string;

  // Adapter options
  defaultBucket?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];

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

## Features

- Zero additional dependencies for multipart parsing (uses Hono's built-in parser)
- Edge runtime compatible
- Works with Cloudflare Workers, Deno, Bun, and Node.js
- Automatic error handling with proper HTTP status codes

## Error Handling Middleware

```typescript
import { storageErrorMiddleware } from "@storage-kit/hono";

app.use("*", storageErrorMiddleware());
```

## License

MIT
