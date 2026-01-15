# Core Concepts

## Provider

A **Provider** is the underlying storage backend. Storage Kit supports any S3-compatible provider. You configure the provider when initializing the client.

- `minio`
- `backblaze`
- `cloudflare-r2`

## Bucket

A **Bucket** is a container for objects (files). Think of it like a root folder or a drive.
In Storage Kit, you can perform operations on a specific bucket using `.getBucket('name')` or `.bucket('name')`.

## Key

A **Key** is the unique identifier for an object within a bucket. It often looks like a file path (e.g., `users/123/avatar.png`).

## Presigned URL

A **Presigned URL** is a temporary URL that grants permission to upload or download a specific object. This is secure because:
1. It expires after a set time (e.g., 1 hour).
2. It allows the client to upload directly to the storage provider, bypassing your server (saving bandwidth).

## Storage Client vs Service

- **StorageClient**: The frontend SDK for interacting with your backend API.
- **StorageService**: The backend logic that wraps the AWS S3 client.
