# NestJS Integration

<p style="display: flex; gap: 6px; align-items: center;">
  <a href="https://www.npmjs.com/package/@storage-kit/nestjs"><img src="https://nodei.co/npm/@storage-kit/nestjs.svg?style=shields&data=n,v" alt="npm version" style="border-radius: 6px;"></a>
  <a href="https://github.com/Tranthanh98/storage-kit"><img src="https://img.shields.io/github/stars/Tranthanh98/storage-kit.svg?style=flat-square&colorA=18181b&colorB=28CF8D" alt="GitHub stars" style="border-radius: 6px;"></a>
</p>

The `@storage-kit/nestjs` module provides a native NestJS experience with dependency injection and decorators.

## Installation

```bash
npm install @storage-kit/nestjs @nestjs/platform-express
# or
pnpm add @storage-kit/nestjs @nestjs/platform-express
```

## Setup Module

Import `StorageKitModule` in your root `AppModule`.

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { StorageKitModule } from "@storage-kit/nestjs";

@Module({
  imports: [
    StorageKitModule.forRoot({
      provider: "minio",
      endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    }),
  ],
})
export class AppModule {}
```

## Multi-Provider Configuration

Storage Kit supports configuring multiple storage providers and switching between them at runtime:

```typescript
// app.module.ts
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

See the [Multi-Provider Guide](/guide/multi-provider) for more details.

## Async Configuration

If you need to use `ConfigService` for secrets:

```typescript
StorageKitModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    provider: "minio",
    endpoint: config.get("MINIO_ENDPOINT"),
    accessKeyId: config.get("MINIO_ACCESS_KEY"),
    secretAccessKey: config.get("MINIO_SECRET_KEY"),
  }),
  inject: [ConfigService],
})
```

## Usage

### In Services

Inject `StorageKitService` to perform operations.

```typescript
import { Injectable } from "@nestjs/common";
import { StorageKitService } from "@storage-kit/nestjs";

@Injectable()
export class AvatarService {
  constructor(private readonly storage: StorageKitService) {}

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    return this.storage.handleUpload(
      "avatars-bucket",
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      `users/${userId}`
    );
  }
}
```

### Enable Swagger UI

You can expose the auto-generated API docs in your `main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Swagger UI at /reference
  StorageKitModule.setupSwagger(app);

  await app.listen(3000);
}
```
