# Example Server Specification

## ADDED Requirements

### Requirement: Swagger UI Reference Endpoint

The example server SHALL provide a Swagger UI interface at `/api/storage/reference` for interactive API exploration.

#### Scenario: Accessing Swagger UI

- **WHEN** a developer navigates to `http://localhost:3000/api/storage/reference` in a browser
- **THEN** Swagger UI loads with the Storage Kit OpenAPI specification
- **AND** all endpoints are visible and documented
- **AND** the developer can execute API calls directly from the UI

#### Scenario: API spec synchronization

- **WHEN** the Swagger UI loads
- **THEN** it uses the OpenAPI spec from `@storage-kit/core/openapi/storage-api.yaml`
- **AND** the spec version matches the installed `@storage-kit/core` version

---

### Requirement: Storage Endpoints Mount

The example server SHALL mount the `@storage-kit/express` adapter at `/api/storage`.

#### Scenario: File upload through example server

- **WHEN** a developer uploads a file via `POST /api/storage/{bucket}/files`
- **THEN** the file is stored in the configured storage provider
- **AND** the response matches the OpenAPI specification

#### Scenario: Health check through example server

- **WHEN** a developer calls `GET /api/storage/health`
- **THEN** the server returns the storage provider health status

---

### Requirement: Local Development Environment

The example server SHALL include a Docker Compose configuration for local testing with MinIO.

#### Scenario: Starting local development environment

- **WHEN** a developer runs `docker-compose up -d` in the example directory
- **THEN** MinIO starts on port 9000 (API) and 9001 (console)
- **AND** the developer can access the MinIO console at `http://localhost:9001`

#### Scenario: Running example server with local MinIO

- **WHEN** the developer runs `pnpm dev` after starting Docker Compose
- **THEN** the server connects to local MinIO using default credentials
- **AND** the Swagger UI is accessible at `http://localhost:3000/api/storage/reference`

---

### Requirement: Environment Configuration

The example server SHALL support configuration via environment variables.

#### Scenario: Custom endpoint configuration

- **WHEN** the developer sets `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY` environment variables
- **THEN** the server uses these values to connect to the storage provider

#### Scenario: Default configuration fallback

- **WHEN** no environment variables are set
- **AND** a `.env` file exists based on `.env.example`
- **THEN** the server loads configuration from the `.env` file
