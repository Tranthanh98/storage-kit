# Design: Example Express Server with Swagger UI

## Context

Storage Kit provides framework adapters (`@storage-kit/express`, etc.) but lacks a quick-start example that developers can run immediately to explore the API. The goal is to provide a "zero to API testing" experience similar to [better-auth's reference endpoint](https://www.better-auth.com/docs/concepts/api).

### Constraints

1. Example must work with local MinIO (no cloud credentials required)
2. Swagger UI must accurately reflect the OpenAPI spec
3. Must not add dependencies to the main packages
4. Should be easy to copy/modify for real projects

## Goals

- **Instant Gratification**: Run one command, see Swagger UI
- **Self-Documenting**: API is explorable without reading docs
- **Copy-Paste Friendly**: Example code can be used as a starting point

## Non-Goals

- Production-ready server configuration
- Authentication/authorization examples (separate concern)
- Multi-provider switching UI

## Decisions

### 1. Swagger UI Library

**Decision**: Use `swagger-ui-express` for serving Swagger UI.

**Rationale**:
- De-facto standard for Express + Swagger
- Active maintenance
- Simple integration: just `app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec))`

### 2. OpenAPI Spec Loading

**Decision**: Import the YAML spec file and parse it at runtime.

**Rationale**:
```typescript
import { readFileSync } from "fs";
import { parse } from "yaml";

const specPath = require.resolve("@storage-kit/core/openapi/storage-api.yaml");
const spec = parse(readFileSync(specPath, "utf8"));
```

This approach:
- Uses the canonical spec from `@storage-kit/core`
- Automatically stays in sync with spec updates
- Avoids duplication

### 3. Route Structure

**Decision**: Mount at `/api/storage` with reference at `/api/storage/reference`.

```
/api/storage/reference     → Swagger UI
/api/storage/health        → Health check
/api/storage/:bucket/files → File operations
```

**Rationale**:
- Matches better-auth's `/api/auth/reference` pattern
- Clear separation between docs and API
- Intuitive URL structure

### 4. Local Development with Docker

**Decision**: Provide Docker Compose with MinIO.

```yaml
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
```

**Rationale**:
- No cloud account needed for testing
- MinIO is S3-compatible (works with all providers)
- Console UI at :9001 for bucket management

### 5. Project Location

**Decision**: Place in `examples/express-server/` (not a workspace package).

**Rationale**:
- Examples are not published to npm
- Keeps monorepo clean
- Clear distinction from library packages

## Alternatives Considered

### Scalar API Reference

- **Considered**: Using [Scalar](https://github.com/scalar/scalar) instead of Swagger UI
- **Rejected**: Swagger UI is more widely recognized; Scalar could be added later

### Embedded in Express Adapter

- **Considered**: Add `storageKit.reference()` middleware to `@storage-kit/express`
- **Rejected**: Adds dependencies to the library; examples should be separate

## Implementation Notes

The example server should be minimal (~50 lines) to serve as a clear template:

```typescript
import express from "express";
import swaggerUi from "swagger-ui-express";
import { storageKit } from "@storage-kit/express";
import { loadOpenApiSpec } from "./utils";

const app = express();
app.use(express.json());

// Swagger UI at /api/storage/reference
const spec = loadOpenApiSpec();
app.use("/api/storage/reference", swaggerUi.serve, swaggerUi.setup(spec));

// Storage endpoints at /api/storage
app.use("/api/storage", storageKit({
  provider: "minio",
  endpoint: process.env.MINIO_ENDPOINT,
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
}));

app.listen(3000);
```
