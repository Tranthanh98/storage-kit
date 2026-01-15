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
