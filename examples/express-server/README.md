# Storage Kit Example Server

A ready-to-run Express.js server with **Swagger UI** for testing Storage Kit APIs.

## Quick Start

### 1. Start MinIO (Local S3-compatible storage)

```bash
docker-compose up -d
```

This starts:
- **MinIO API** at `http://localhost:9000`
- **MinIO Console** at `http://localhost:9001` (login: `minioadmin` / `minioadmin`)
- Creates a `test-bucket` automatically

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start the Server

```bash
pnpm dev
```

### 4. Open Swagger UI

Navigate to: **http://localhost:3000/api/storage/reference**

You'll see an interactive API documentation where you can:
- Test file uploads
- Delete files
- Generate signed URLs
- Check health status

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server info and links |
| `GET /api/storage/reference` | Swagger UI |
| `GET /api/storage/health` | Health check |
| `POST /api/storage/{bucket}/files` | Upload file |
| `DELETE /api/storage/{bucket}/files/{filePath}` | Delete file |
| `DELETE /api/storage/{bucket}/files` | Bulk delete |
| `GET /api/storage/{bucket}/signed-url` | Get signed URL |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO/S3 endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | Access key |
| `MINIO_SECRET_KEY` | `minioadmin` | Secret key |

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

## Testing with Swagger UI

### Upload a File

1. Open http://localhost:3000/api/storage/reference
2. Click on `POST /{bucket}/files`
3. Click "Try it out"
4. Enter `test-bucket` as the bucket name
5. Select a file to upload
6. Click "Execute"

### Generate a Signed URL

1. Open http://localhost:3000/api/storage/reference
2. Click on `GET /{bucket}/signed-url`
3. Click "Try it out"
4. Enter:
   - `bucket`: `test-bucket`
   - `key`: `my-file.png`
   - `type`: `upload`
5. Click "Execute"

## Using with Other Providers

To use with Backblaze B2 or Cloudflare R2, update the environment variables:

```bash
# Backblaze B2
MINIO_ENDPOINT=https://s3.us-west-002.backblazeb2.com
MINIO_ACCESS_KEY=your-key-id
MINIO_SECRET_KEY=your-application-key

# Cloudflare R2
MINIO_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
```

## Cleanup

Stop MinIO:

```bash
docker-compose down
```

Remove MinIO data:

```bash
docker-compose down -v
```
