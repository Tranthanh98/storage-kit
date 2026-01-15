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

## Amazon S3

```typescript
interface S3Config {
  provider: "s3";
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // Optional custom endpoint
  publicUrlBase?: string;
}
```

## Google Cloud Storage

Storage Kit uses S3 interoperability for Google Cloud Storage. You must generate HMAC keys in the Google Cloud Console.

```typescript
interface GCSConfig {
  provider: "gcs";
  accessKeyId: string; // HMAC Access Key
  secretAccessKey: string; // HMAC Secret
  endpoint?: string; // Defaults to https://storage.googleapis.com
  publicUrlBase?: string;
}
```

## DigitalOcean Spaces

```typescript
interface SpacesConfig {
  provider: "spaces";
  endpoint: string; // e.g., https://nyc3.digitaloceanspaces.com
  accessKeyId: string;
  secretAccessKey: string;
  region?: string; // e.g., nyc3
  publicUrlBase?: string;
}
```

## Azure Blob Storage

Azure Blob Storage supports two authentication methods: Connection String or Account Name & Key.

### Connection String

```typescript
interface AzureConnectionStringConfig {
  provider: "azure";
  connectionString: string;
  publicUrlBase?: string;
}
```

### Account Credentials

```typescript
interface AzureAccountConfig {
  provider: "azure";
  accountName: string;
  accountKey: string;
  publicUrlBase?: string;
}
```
