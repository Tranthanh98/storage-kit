# Storage API Specification

## ADDED Requirements

### Requirement: File Upload

The system SHALL accept file uploads via multipart/form-data at `POST /storage/{bucket}/files` and return the public URL of the uploaded file.

#### Scenario: Successful file upload

- **WHEN** a valid multipart request is sent with a `file` field
- **THEN** the file is stored in the specified bucket
- **AND** the response status is 201
- **AND** the response body contains `url` (public URL) and `key` (storage path)

#### Scenario: Upload with folder path

- **WHEN** a multipart request includes an optional `path` field (e.g., "avatars/user123")
- **THEN** the file is stored under that path prefix
- **AND** the returned `key` reflects the full path (e.g., "avatars/user123/image.png")

#### Scenario: Upload with content type override

- **WHEN** a multipart request includes an optional `contentType` field
- **THEN** the file is stored with that MIME type
- **AND** subsequent downloads return that content type header

#### Scenario: Bucket not found

- **WHEN** the specified bucket does not exist
- **THEN** the response status is 404
- **AND** the error code is `BUCKET_NOT_FOUND`

#### Scenario: Missing file in request

- **WHEN** the request does not contain a `file` field
- **THEN** the response status is 400
- **AND** the error code is `MISSING_FILE`

---

### Requirement: Single File Deletion

The system SHALL delete a single file at `DELETE /storage/{bucket}/files/{filePath}` where `filePath` is URL-encoded.

#### Scenario: Successful file deletion

- **WHEN** a DELETE request is sent with a valid bucket and filePath
- **THEN** the file is removed from storage
- **AND** the response status is 204 (No Content)

#### Scenario: File not found

- **WHEN** the specified file does not exist
- **THEN** the response status is 404
- **AND** the error code is `FILE_NOT_FOUND`

#### Scenario: Delete file in nested folder

- **WHEN** the filePath is URL-encoded (e.g., `folder%2Fsubfolder%2Ffile.png`)
- **THEN** the file at `folder/subfolder/file.png` is deleted

---

### Requirement: Bulk File Deletion

The system SHALL delete multiple files at `DELETE /storage/{bucket}/files` with a JSON body containing an array of keys.

#### Scenario: Successful bulk deletion

- **WHEN** a DELETE request is sent with body `{"keys": ["file1.png", "folder/file2.png"]}`
- **THEN** all specified files are removed from storage
- **AND** the response status is 200
- **AND** the response body contains `deleted` (count) and `failed` (array of failed keys with reasons)

#### Scenario: Partial failure in bulk deletion

- **WHEN** some files exist and some do not
- **THEN** existing files are deleted
- **AND** the response includes failed keys with `FILE_NOT_FOUND` reason
- **AND** the response status is 200 (partial success)

#### Scenario: Empty keys array

- **WHEN** the request body contains an empty `keys` array
- **THEN** the response status is 400
- **AND** the error code is `EMPTY_KEYS_ARRAY`

#### Scenario: Keys array exceeds limit

- **WHEN** the `keys` array contains more than 1000 items
- **THEN** the response status is 400
- **AND** the error code is `KEYS_LIMIT_EXCEEDED`

---

### Requirement: Signed URL Generation

The system SHALL generate presigned URLs at `GET /storage/{bucket}/signed-url` for both upload and download operations.

#### Scenario: Generate upload signed URL

- **WHEN** a GET request is sent with query params `key=file.png&type=upload`
- **THEN** the response status is 200
- **AND** the response body contains:
  - `signedUrl`: presigned PUT URL
  - `publicUrl`: the eventual public URL after upload
  - `expiresAt`: ISO 8601 timestamp of expiration

#### Scenario: Generate download signed URL

- **WHEN** a GET request is sent with query params `key=file.png&type=download`
- **THEN** the response status is 200
- **AND** the response body contains:
  - `signedUrl`: presigned GET URL
  - `expiresAt`: ISO 8601 timestamp of expiration

#### Scenario: Custom expiration time

- **WHEN** the request includes optional `expiresIn` query param (seconds)
- **THEN** the signed URL expires after that duration
- **AND** maximum allowed value is 604800 (7 days)

#### Scenario: Custom content type for upload

- **WHEN** the request includes optional `contentType` query param for upload type
- **THEN** the presigned URL enforces that content type on upload

#### Scenario: Missing required parameters

- **WHEN** the `key` or `type` query param is missing
- **THEN** the response status is 400
- **AND** the error code is `MISSING_REQUIRED_PARAM`

#### Scenario: Invalid type parameter

- **WHEN** the `type` param is not "upload" or "download"
- **THEN** the response status is 400
- **AND** the error code is `INVALID_SIGNED_URL_TYPE`

---

### Requirement: Health Check (Optional)

The system SHALL provide an optional health check endpoint at `GET /storage/health` to verify provider connectivity. This endpoint is not required for core functionality but is recommended for production deployments.

#### Scenario: Provider is healthy

- **WHEN** a GET request is sent to `/storage/health`
- **AND** the storage provider is accessible
- **THEN** the response status is 200
- **AND** the response body contains `{"status": "healthy", "provider": "<provider-name>"}`

#### Scenario: Provider is unreachable

- **WHEN** the storage provider is not accessible
- **THEN** the response status is 503
- **AND** the response body contains `{"status": "unhealthy", "error": "<reason>"}`

---

### Requirement: Consistent Error Response Format

The system SHALL return all errors in a consistent JSON format.

#### Scenario: Error response structure

- **WHEN** any API error occurs
- **THEN** the response body follows this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

#### Scenario: Standard error codes

- **WHEN** an error occurs
- **THEN** the error code is one of:
  - `BUCKET_NOT_FOUND` (404)
  - `FILE_NOT_FOUND` (404)
  - `MISSING_FILE` (400)
  - `MISSING_REQUIRED_PARAM` (400)
  - `INVALID_SIGNED_URL_TYPE` (400)
  - `EMPTY_KEYS_ARRAY` (400)
  - `KEYS_LIMIT_EXCEEDED` (400)
  - `UPLOAD_FAILED` (500)
  - `DELETE_FAILED` (500)
  - `SIGNED_URL_FAILED` (500)
  - `PROVIDER_ERROR` (500)

---

### Requirement: OpenAPI 3.x Specification

The system SHALL provide an OpenAPI 3.0.3 specification document that accurately describes all endpoints.

#### Scenario: Specification completeness

- **WHEN** the OpenAPI spec is parsed
- **THEN** it includes:
  - All endpoint paths and methods
  - Request body schemas with examples
  - Response schemas for success and error cases
  - Query parameter definitions
  - Path parameter definitions
  - Standard HTTP status codes

#### Scenario: Specification validation

- **WHEN** the OpenAPI spec is validated with a linter
- **THEN** no errors are reported
- **AND** no warnings for missing descriptions
