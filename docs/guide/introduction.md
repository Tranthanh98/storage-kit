# Introduction

**Storage Kit** is a unified, framework-agnostic storage service for S3-compatible providers. It abstracts away the complexity of managing different storage backends, providing a consistent API for uploading, downloading, and managing files.

## Why Storage Kit?

- **Unified Interface**: Write your storage logic once, and it works with AWS S3, Google Cloud Storage, Azure Blob Storage, DigitalOcean Spaces, MinIO, Backblaze B2, and Cloudflare R2.
- **Developer Experience**: TypeScript-first, with built-in validation and standardized error handling.
- **Framework Support**: Seamlessly integrates with modern frameworks like Next.js, Fastify, Express, and Hono.
- **Zero Lock-in**: Easily switch providers by changing environment variables.

## Supported Providers

- **MinIO**: Great for local development and self-hosted storage.
- **Backblaze B2**: Affordable, enterprise-grade cloud storage.
- **Cloudflare R2**: Egress-fee-free storage at the edge.
- **Amazon S3**: The standard for object storage.
- **Google Cloud Storage**: Scalable and secure object storage (via S3 interoperability).
- **Azure Blob Storage**: Massively scalable object storage for cloud-native workloads.
- **DigitalOcean Spaces**: S3-compatible object storage with a built-in CDN.
