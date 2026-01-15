# Providers API

Configuration options for different storage providers.

## MinIO

```typescript
interface MinioConfig {
  provider: "minio";
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  publicUrlBase?: string;
}
```

## Backblaze B2

```typescript
interface BackblazeConfig {
  provider: "backblaze";
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  publicUrlBase?: string;
}
```

## Cloudflare R2

```typescript
interface R2Config {
  provider: "cloudflare-r2";
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrlBase?: string;
}
```
