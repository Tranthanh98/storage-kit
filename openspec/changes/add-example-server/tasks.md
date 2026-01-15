# Tasks: Add Example Express Server with Swagger UI

## 1. Project Setup

- [x] 1.1 Create `examples/express-server/` directory structure
- [x] 1.2 Create `package.json` with required dependencies
- [x] 1.3 Create `tsconfig.json` for TypeScript compilation
- [x] 1.4 Create `.env.example` with MinIO configuration template

## 2. Server Implementation

- [x] 2.1 Create main server entry point (`src/index.ts`)
- [x] 2.2 Mount `@storage-kit/express` adapter at `/api/storage`
- [x] 2.3 Swagger UI is now built into the adapter (no manual setup needed)
- [x] 2.4 OpenAPI spec is automatically loaded from `@storage-kit/core/openapi`
- [x] 2.5 Add CORS support for local development
- [x] 2.6 Add environment variable configuration

## 3. Local Development Environment

- [x] 3.1 Create `docker-compose.yml` with MinIO service
- [x] 3.2 Add MinIO console access configuration
- [x] 3.3 Create default bucket initialization script (optional)

## 4. Documentation

- [x] 4.1 Write `README.md` with quick start guide
- [x] 4.2 Document environment variables
- [x] 4.3 Add usage examples for common operations

## 5. Validation

- [x] 5.1 Test server starts successfully
- [x] 5.2 Verify Swagger UI loads at `/api/storage/reference`
- [ ] 5.3 Test file upload through Swagger UI
- [ ] 5.4 Test file deletion through Swagger UI
- [ ] 5.5 Test signed URL generation through Swagger UI

## 6. Built-in Swagger UI for All Adapters

- [x] 6.1 Simplify example server to use built-in Swagger (removed manual setup)
- [x] 6.2 Remove swagger-ui-express, yaml dependencies from example
- [x] 6.3 Add Swagger UI to @storage-kit/express
- [x] 6.4 Add Swagger UI to @storage-kit/fastify
- [x] 6.5 Add Swagger UI to @storage-kit/hono
- [x] 6.6 Add Swagger UI to @storage-kit/nestjs
- [x] 6.7 Update all adapter READMEs with Swagger documentation

Note: Tasks 5.3-5.5 require MinIO to be running (`docker-compose up -d`) and can be tested manually through the Swagger UI.
