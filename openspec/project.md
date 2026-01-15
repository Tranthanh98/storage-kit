# Project Context

## Purpose

Storage Kit is a framework-agnostic, reusable npm package that provides a unified HTTP API for object storage operations. It abstracts away provider-specific implementations, allowing applications to switch between storage backends (MinIO, Backblaze B2, Cloudflare R2) without code changes.

## Tech Stack

- TypeScript
- AWS SDK v3 (S3-compatible API)
- OpenAPI 3.x for API specification

## Project Conventions

### Code Style

- TypeScript strict mode
- Interfaces prefixed with `I` (e.g., `IStorageService`)
- English comments and documentation
- Consistent error handling with typed error classes

### Architecture Patterns

- Provider pattern: Each storage backend implements `IStorageService`
- S3-compatible: All providers use AWS SDK with S3-compatible endpoints
- Framework-agnostic: HTTP handlers are generic, not tied to Express/Fastify/etc.

### Testing Strategy

- Unit tests for each provider
- Integration tests with local MinIO
- OpenAPI spec validation

### Git Workflow

- Conventional commits (feat:, fix:, docs:, etc.)
- Feature branches merged via PR

## Domain Context

- **Bucket**: Container for objects (like a folder)
- **Key**: Path to an object within a bucket (e.g., `avatars/user123/profile.png`)
- **Presigned URL**: Time-limited URL that grants temporary access to upload or download
- **Provider**: Storage backend (MinIO, B2, R2)

## Important Constraints

- No authentication logic in the package (delegated to consuming application)
- All providers must implement the same interface
- API responses must be JSON
- Maximum 1000 keys per bulk delete operation

## External Dependencies

- AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- Storage providers configured via environment variables
