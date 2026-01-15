# Tasks: Add Framework Adapters

## 0. Prerequisites

- [x] 0.1 Convert project to monorepo structure (pnpm workspaces)
- [x] 0.2 Move existing code to `packages/core/`
- [x] 0.3 Update root package.json for workspace configuration
- [x] 0.4 Create shared tsconfig base for packages

## 1. Core Handler Abstraction

- [x] 1.1 Create `StorageHandler` class in `@storage-kit/core`
- [x] 1.2 Implement `handleUpload()` method with file validation
- [x] 1.3 Implement `handleDelete()` and `handleBulkDelete()` methods
- [x] 1.4 Implement `handleSignedUrl()` method with type validation
- [x] 1.5 Implement `handleHealthCheck()` method
- [x] 1.6 Create `UploadedFile` interface for normalized file input
- [x] 1.7 Create `StorageKitConfig` interface with common options
- [x] 1.8 Create `mapErrorToResponse()` utility for HTTP status mapping
- [x] 1.9 Export new types and classes from `@storage-kit/core`
- [ ] 1.10 Add unit tests for `StorageHandler`

## 2. Express Adapter (`@storage-kit/express`)

- [x] 2.1 Scaffold `packages/express/` with package.json, tsconfig
- [x] 2.2 Add `multer` as dependency for multipart parsing
- [x] 2.3 Create `storageKit()` factory function returning `express.Router`
- [x] 2.4 Implement `POST /:bucket/files` route (file upload)
- [x] 2.5 Implement `DELETE /:bucket/files/:filePath` route (single delete)
- [x] 2.6 Implement `DELETE /:bucket/files` route (bulk delete)
- [x] 2.7 Implement `GET /:bucket/signed-url` route
- [x] 2.8 Implement `GET /health` route
- [x] 2.9 Add error handling middleware for `StorageError`
- [x] 2.10 Create TypeScript type definitions
- [ ] 2.11 Add unit tests for Express adapter
- [ ] 2.12 Add integration tests with supertest
- [x] 2.13 Write README with usage examples

## 3. Fastify Adapter (`@storage-kit/fastify`)

- [x] 3.1 Scaffold `packages/fastify/` with package.json, tsconfig
- [x] 3.2 Add `@fastify/multipart` as dependency
- [x] 3.3 Create `storageKitPlugin` as Fastify plugin
- [x] 3.4 Implement all routes matching OpenAPI spec
- [x] 3.5 Add schema validation using Fastify's built-in JSON schema
- [x] 3.6 Implement error handler hook for `StorageError`
- [x] 3.7 Create TypeScript type definitions
- [ ] 3.8 Add unit tests for Fastify adapter
- [x] 3.9 Write README with usage examples

## 4. Hono Adapter (`@storage-kit/hono`)

- [x] 4.1 Scaffold `packages/hono/` with package.json, tsconfig
- [x] 4.2 Create `storageKit()` factory returning Hono app instance
- [x] 4.3 Implement routes using Hono's built-in multipart parsing
- [x] 4.4 Implement error handler middleware
- [x] 4.5 Ensure edge runtime compatibility (no Node.js-only APIs)
- [x] 4.6 Create TypeScript type definitions
- [ ] 4.7 Add unit tests for Hono adapter
- [x] 4.8 Write README with usage examples

## 5. NestJS Adapter (`@storage-kit/nestjs`)

- [x] 5.1 Scaffold `packages/nestjs/` with package.json, tsconfig
- [x] 5.2 Add `@nestjs/common`, `@nestjs/platform-express`, `multer` as peer deps
- [x] 5.3 Create `StorageKitModule` with `forRoot()` and `forRootAsync()` methods
- [x] 5.4 Create `StorageKitService` wrapping `StorageHandler`
- [x] 5.5 Create `StorageKitController` with decorated route handlers
- [x] 5.6 Create `@UploadedStorageFile()` parameter decorator
- [x] 5.7 Implement exception filter for `StorageError`
- [x] 5.8 Create TypeScript type definitions
- [ ] 5.9 Add unit tests for NestJS adapter
- [x] 5.10 Write README with usage examples

## 6. Documentation

- [x] 6.1 Update root README with adapter overview
- [ ] 6.2 Create migration guide for manual implementations
- [ ] 6.3 Add framework comparison table (features, bundle size)
- [x] 6.4 Create example projects for each framework

## 7. Built-in Swagger UI

- [x] 7.1 Add Swagger UI to Express adapter (`swagger-ui-express`)
- [x] 7.2 Add Swagger UI to Fastify adapter (`@fastify/swagger`, `@fastify/swagger-ui`)
- [x] 7.3 Add Swagger UI to Hono adapter (`@hono/swagger-ui`)
- [x] 7.4 Add Swagger UI to NestJS adapter (`@nestjs/swagger`)
- [x] 7.5 Add SwaggerOptions interface for customization
- [x] 7.6 Enable Swagger by default at `/reference` path
- [x] 7.7 Update READMEs with Swagger UI documentation

## 8. CI/CD & Publishing

- [x] 8.1 Update build scripts for monorepo
- [ ] 8.2 Configure changesets or similar for versioning
- [ ] 8.3 Add CI workflow for testing all packages
- [ ] 8.4 Configure npm publishing for scoped packages
