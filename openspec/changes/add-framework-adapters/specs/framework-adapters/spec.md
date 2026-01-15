# Framework Adapters Specification

## ADDED Requirements

### Requirement: Adapter Factory Pattern

Each framework adapter SHALL export a factory function that accepts a configuration object and returns framework-native middleware or router.

#### Scenario: Express adapter initialization

- **WHEN** the developer imports `storageKit` from `@storage-kit/express`
- **AND** calls `storageKit({ provider: "minio", endpoint: "http://localhost:9000", accessKeyId: "admin", secretAccessKey: "password" })`
- **THEN** the function returns an `express.Router` instance
- **AND** the router handles all storage endpoints defined in the OpenAPI spec

#### Scenario: Fastify plugin registration

- **WHEN** the developer imports `storageKitPlugin` from `@storage-kit/fastify`
- **AND** registers it with `fastify.register(storageKitPlugin, { prefix: "/storage", provider: "minio", ... })`
- **THEN** Fastify registers routes under the specified prefix
- **AND** all storage operations are available via the plugin

#### Scenario: Hono middleware composition

- **WHEN** the developer imports `storageKit` from `@storage-kit/hono`
- **AND** mounts it with `app.route("/storage", storageKit({ provider: "cloudflare-r2", ... }))`
- **THEN** the Hono app instance is returned
- **AND** routes are edge-runtime compatible

#### Scenario: NestJS module import

- **WHEN** the developer imports `StorageKitModule` from `@storage-kit/nestjs`
- **AND** adds `StorageKitModule.forRoot({ provider: "backblaze", ... })` to module imports
- **THEN** the storage controller and service are registered
- **AND** the service can be injected into other providers

---

### Requirement: Unified Configuration Interface

All adapters SHALL accept a common configuration interface for provider and adapter settings.

#### Scenario: Minimal configuration

- **WHEN** only `provider` is specified
- **THEN** the adapter uses environment variables for credentials
- **AND** default values are applied for optional settings

#### Scenario: Full configuration

- **WHEN** all configuration options are provided
- **THEN** the adapter uses the provided values
- **AND** environment variables are ignored

#### Scenario: Configuration validation

- **WHEN** required configuration is missing (e.g., no provider specified)
- **THEN** the adapter throws a descriptive error at initialization time
- **AND** the error message indicates which configuration is missing

---

### Requirement: OpenAPI-Compliant Routes

All adapters SHALL implement routes matching the OpenAPI specification in `openapi/storage-api.yaml`.

#### Scenario: File upload route

- **WHEN** a `POST /:bucket/files` request is received with multipart/form-data
- **THEN** the adapter parses the file using framework-native multipart handling
- **AND** delegates to `StorageHandler.handleUpload()`
- **AND** returns the response as JSON with status 201

#### Scenario: Single file deletion route

- **WHEN** a `DELETE /:bucket/files/:filePath` request is received
- **THEN** the adapter URL-decodes the `filePath` parameter
- **AND** delegates to `StorageHandler.handleDelete()`
- **AND** returns status 204 on success

#### Scenario: Bulk file deletion route

- **WHEN** a `DELETE /:bucket/files` request is received with JSON body `{ "keys": [...] }`
- **THEN** the adapter parses the JSON body
- **AND** delegates to `StorageHandler.handleBulkDelete()`
- **AND** returns the bulk delete response as JSON with status 200

#### Scenario: Signed URL generation route

- **WHEN** a `GET /:bucket/signed-url` request is received with query params `key` and `type`
- **THEN** the adapter validates the `type` parameter is "upload" or "download"
- **AND** delegates to `StorageHandler.handleSignedUrl()`
- **AND** returns the signed URL response as JSON with status 200

#### Scenario: Health check route

- **WHEN** a `GET /health` request is received
- **THEN** the adapter delegates to `StorageHandler.handleHealthCheck()`
- **AND** returns status 200 if healthy, 503 if unhealthy

---

### Requirement: Automatic Error Response Mapping

All adapters SHALL automatically convert `StorageError` exceptions to HTTP responses.

#### Scenario: Client error mapping

- **WHEN** a `StorageError` with code `MISSING_FILE`, `MISSING_REQUIRED_PARAM`, `INVALID_SIGNED_URL_TYPE`, `EMPTY_KEYS_ARRAY`, or `KEYS_LIMIT_EXCEEDED` is thrown
- **THEN** the adapter returns HTTP status 400
- **AND** the response body is the error's JSON representation

#### Scenario: Not found error mapping

- **WHEN** a `StorageError` with code `BUCKET_NOT_FOUND` or `FILE_NOT_FOUND` is thrown
- **THEN** the adapter returns HTTP status 404
- **AND** the response body is the error's JSON representation

#### Scenario: Server error mapping

- **WHEN** a `StorageError` with code `UPLOAD_FAILED`, `DELETE_FAILED`, `SIGNED_URL_FAILED`, or `PROVIDER_ERROR` is thrown
- **THEN** the adapter returns HTTP status 500
- **AND** the response body is the error's JSON representation

#### Scenario: Unexpected error handling

- **WHEN** a non-StorageError exception is thrown
- **THEN** the adapter returns HTTP status 500
- **AND** the response body contains a generic `PROVIDER_ERROR` code
- **AND** sensitive error details are not exposed

---

### Requirement: Multipart File Parsing

Each adapter SHALL handle multipart/form-data parsing using framework-appropriate methods.

#### Scenario: Express file parsing with multer

- **WHEN** a file upload request is received by the Express adapter
- **THEN** multer parses the `file` field
- **AND** the file buffer, original name, and MIME type are extracted
- **AND** the optional `path` and `contentType` form fields are parsed

#### Scenario: Fastify file parsing with @fastify/multipart

- **WHEN** a file upload request is received by the Fastify adapter
- **THEN** @fastify/multipart streams the file data
- **AND** the file is buffered and passed to the handler

#### Scenario: Hono file parsing with built-in parser

- **WHEN** a file upload request is received by the Hono adapter
- **THEN** `c.req.parseBody()` extracts the file
- **AND** no additional dependencies are required
- **AND** the adapter works in edge runtimes (Cloudflare Workers, Deno, Bun)

#### Scenario: NestJS file parsing with Multer interceptor

- **WHEN** a file upload request is received by the NestJS adapter
- **THEN** the `@UseInterceptors(FileInterceptor('file'))` decorator handles parsing
- **AND** the file is available via `@UploadedFile()` decorator

---

### Requirement: Storage Handler Core Abstraction

The `@storage-kit/core` package SHALL export a `StorageHandler` class that contains all business logic for HTTP operations.

#### Scenario: Handler initialization

- **WHEN** a `StorageHandler` is created with an `IStorageService` instance
- **THEN** the handler is ready to process requests
- **AND** no framework-specific code is required

#### Scenario: Upload handling

- **WHEN** `handleUpload(bucket, file, path?)` is called
- **THEN** the handler validates the file is present
- **AND** uploads via `storage.getBucket(bucket).uploadFile(...)`
- **AND** returns `FileUploadResponse`

#### Scenario: Bulk delete handling with validation

- **WHEN** `handleBulkDelete(bucket, keys)` is called with empty array
- **THEN** the handler throws `StorageError` with code `EMPTY_KEYS_ARRAY`

#### Scenario: Signed URL handling with type validation

- **WHEN** `handleSignedUrl(bucket, key, type, options?)` is called with invalid type
- **THEN** the handler throws `StorageError` with code `INVALID_SIGNED_URL_TYPE`

---

### Requirement: Customizable Route Prefix

All adapters SHALL allow customization of the route prefix.

#### Scenario: Default prefix

- **WHEN** no prefix is configured
- **THEN** routes are mounted at the path where the middleware is used
- **AND** the consuming application controls the base path

#### Scenario: Custom prefix in Fastify

- **WHEN** Fastify plugin is registered with `{ prefix: "/api/v1/storage" }`
- **THEN** all routes are prefixed with `/api/v1/storage`
- **AND** e.g., upload is at `/api/v1/storage/:bucket/files`

---

### Requirement: Default Bucket Fallback

Adapters SHALL support a `defaultBucket` configuration option for applications using a single bucket.

#### Scenario: Bucket from URL path

- **WHEN** a request is made to `/:bucket/files` and `defaultBucket` is not configured
- **THEN** the bucket name is extracted from the URL path parameter

#### Scenario: Default bucket override

- **WHEN** `defaultBucket` is configured and the URL uses `/_/files` (underscore placeholder)
- **THEN** the configured `defaultBucket` is used
- **AND** the underscore is treated as "use default"

#### Scenario: Explicit bucket takes precedence

- **WHEN** both `defaultBucket` is configured and a specific bucket is in the URL
- **THEN** the URL bucket takes precedence over the default
