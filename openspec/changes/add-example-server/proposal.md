# Change: Add Example Express Server with Swagger UI

## Why

Developers need a quick way to explore and test the Storage Kit API without writing any code. Currently, to test the API, users must:

1. Set up their own Express/Fastify/etc. server
2. Configure the storage adapter
3. Manually craft HTTP requests or use tools like curl

This friction slows down evaluation and adoption. An example server with Swagger UI (similar to [better-auth's reference endpoint](https://www.better-auth.com/docs/concepts/api)) would allow developers to:

- Instantly see all available endpoints
- Test API calls directly from the browser
- Understand request/response formats visually
- Quickly validate their storage provider configuration

## What Changes

### New Capabilities

- **Example Server** (`examples/express-server/`): A ready-to-run Express.js server that:
  - Mounts the `@storage-kit/express` adapter
  - Serves Swagger UI at `/api/storage/reference`
  - Provides interactive API documentation using the existing OpenAPI spec
  - Includes a simple Docker Compose for local MinIO

### Implementation Approach

The example server will:

1. Use `swagger-ui-express` to serve the Swagger UI
2. Load the OpenAPI spec from `@storage-kit/core/openapi`
3. Mount storage endpoints at `/api/storage`
4. Serve Swagger UI at `/api/storage/reference` (like better-auth pattern)

### Package Structure

```
examples/
└── express-server/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   └── index.ts
    ├── docker-compose.yml   # Local MinIO for testing
    ├── .env.example
    └── README.md
```

### Breaking Changes

None - this is additive functionality. The example is a standalone project, not a new package.

## Impact

- **Affected specs**: None (no spec changes required)
- **Affected code**: None (new standalone example)
- **New directories**: `examples/express-server/`
- **New dependencies** (in example only):
  - `swagger-ui-express`
  - `yaml` (to parse OpenAPI spec)
