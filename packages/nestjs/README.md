# @storage-kit/nestjs

NestJS module for Storage Kit - plug-and-play storage HTTP endpoints.

## Installation

```bash
npm install @storage-kit/nestjs @storage-kit/core @nestjs/platform-express
# or
pnpm add @storage-kit/nestjs @storage-kit/core @nestjs/platform-express
```

## Quick Start

```typescript
import { Module } from "@nestjs/common";
import { StorageKitModule } from "@storage-kit/nestjs";

@Module({
  imports: [
    StorageKitModule.forRoot({
      provider: "minio",
      endpoint: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
    }),
  ],
})
export class AppModule {}
```

## Multi-Provider Configuration

Storage Kit supports configuring multiple storage providers and switching between them at runtime using `useProvider()`. This is useful for multi-region deployments, hybrid cloud strategies, and migrations.

```typescript
import { Module } from "@nestjs/common";
import { StorageKitModule } from "@storage-kit/nestjs";

@Module({
  imports: [
    StorageKitModule.forRoot({
      provider: "minio", // Default provider
      providers: {
        minio: {
          endpoint: "http://localhost:9000",
          accessKeyId: "minioadmin",
          secretAccessKey: "minioadmin",
        },
        "cloudflare-r2": {
          endpoint: "https://account.r2.cloudflarestorage.com",
          accessKeyId: process.env.R2_ACCESS_KEY!,
          secretAccessKey: process.env.R2_SECRET_KEY!,
        },
        s3: {
          region: "us-east-1",
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      },
      defaultBucket: "uploads",
    }),
  ],
})
export class AppModule {}
```

### Using `useProvider()` in Services

```typescript
import { Injectable } from "@nestjs/common";
import { StorageKitService } from "@storage-kit/nestjs";

@Injectable()
export class FileService {
  constructor(private readonly storage: StorageKitService) {}

  async uploadToCDN(file: Buffer, filename: string) {
    // Use R2 for CDN-served files
    return this.storage.useProvider("cloudflare-r2").uploadFile("cdn", file, filename);
  }

  async archiveFile(file: Buffer, filename: string) {
    // Use S3 for archives
    return this.storage.useProvider("s3").uploadFile("archives", file, filename);
  }

  async deleteFromDefault(key: string) {
    // Use default provider (minio)
    return this.storage.handleDelete("uploads", key);
  }
}
```

See the [Multi-Provider Guide](https://tranthanh98.github.io/storage-kit/guide/multi-provider.html) for more details.

## Setting up Swagger UI

The module includes built-in Swagger UI support. Call `setupSwagger` in your `main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { StorageKitModule } from "@storage-kit/nestjs";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Setup Swagger UI (available at /reference by default)
  StorageKitModule.setupSwagger(app);
  
  await app.listen(3000);
  console.log("Server running on http://localhost:3000");
  console.log("API Reference: http://localhost:3000/reference");
}
bootstrap();
```

### Customizing Swagger UI

```typescript
StorageKitModule.setupSwagger(app, {
  path: "/docs",           // Custom path (default: "/reference")
  title: "My Storage API", // Custom page title
  description: "Custom API description",
});
```

### Disabling Swagger UI

```typescript
// Option 1: In module config
StorageKitModule.forRoot({
  provider: "minio",
  // ... credentials
  swagger: false,
});

// Option 2: Simply don't call setupSwagger in main.ts
```

## Async Configuration

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StorageKitModule } from "@storage-kit/nestjs";

@Module({
  imports: [
    ConfigModule.forRoot(),
    StorageKitModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        provider: "minio",
        endpoint: config.get("MINIO_ENDPOINT"),
        accessKeyId: config.get("MINIO_ACCESS_KEY"),
        secretAccessKey: config.get("MINIO_SECRET_KEY"),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Endpoints

The module automatically registers these endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/:bucket/files` | Upload a file |
| `DELETE` | `/:bucket/files/:filePath` | Delete a single file |
| `DELETE` | `/:bucket/files` | Bulk delete files |
| `GET` | `/:bucket/signed-url` | Generate signed URL |
| `GET` | `/health` | Health check |

## Using the Service

Inject `StorageKitService` to use storage operations in your own services:

```typescript
import { Injectable } from "@nestjs/common";
import { StorageKitService, UploadedFile } from "@storage-kit/nestjs";

@Injectable()
export class AvatarService {
  constructor(private storage: StorageKitService) {}

  async uploadAvatar(file: UploadedFile, userId: string) {
    return this.storage.handleUpload(
      "avatars-bucket",
      file,
      `users/${userId}`
    );
  }
}
```

## Configuration

```typescript
interface NestJSStorageKitConfig {
  // Required
  provider: "minio" | "backblaze" | "cloudflare-r2" | "s3" | "gcs" | "spaces" | "azure";

  // Provider credentials
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  publicUrlBase?: string;
  // Azure specific
  connectionString?: string;
  accountName?: string;
  accountKey?: string;

  // Module options
  global?: boolean;        // Make module global
  routePrefix?: string;    // Custom route prefix

  // Adapter options
  defaultBucket?: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];

  // Swagger UI options
  swagger?: boolean | {
    enabled?: boolean;       // Enable/disable (default: true)
    path?: string;           // URL path (default: "/reference")
    title?: string;          // Page title
    description?: string;    // API description
  };

  // Hooks
  onUploadComplete?: (result) => void;
  onError?: (error) => void;

  // Custom storage instance
  storage?: IStorageService;
}
```

## Exception Filters

Apply the built-in exception filter to handle `StorageError`:

```typescript
import { StorageErrorFilter } from "@storage-kit/nestjs";

// In main.ts
app.useGlobalFilters(new StorageErrorFilter());

// Or on a controller
@UseFilters(StorageErrorFilter)
@Controller("storage")
export class MyStorageController {}
```

## Exported Tokens

For advanced use cases, you can inject the underlying services:

```typescript
import { Inject } from "@nestjs/common";
import {
  STORAGE_KIT_SERVICE,  // IStorageService
  STORAGE_KIT_HANDLER,  // StorageHandler
  STORAGE_KIT_CONFIG,   // Config object
} from "@storage-kit/nestjs";
```

## License

MIT
