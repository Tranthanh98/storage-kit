## ADDED Requirements

### Requirement: Client Factory

The package SHALL export a `createStorageClient` factory function that creates a configured client instance.

#### Scenario: Create client with base URL
- **WHEN** developer calls `createStorageClient({ baseURL: "http://localhost:3000/storage" })`
- **THEN** a new client instance is returned with methods for all storage operations

#### Scenario: Create client with custom fetch
- **WHEN** developer provides a custom `fetch` function in config
- **THEN** the client uses the custom fetch for all HTTP requests

#### Scenario: Create client with default headers
- **WHEN** developer provides `headers` in config
- **THEN** all requests include the specified headers (e.g., Authorization)

---

### Requirement: File Upload

The client SHALL provide an `upload` method to upload files to storage.

#### Scenario: Upload file from browser
- **WHEN** developer calls `upload({ bucket: "avatars", file: File, path: "users/123" })`
- **THEN** the file is uploaded via multipart/form-data POST to `/{bucket}/files`
- **AND** returns `{ data: { url, key }, error: null }` on success

#### Scenario: Upload file with buffer (React Native)
- **WHEN** developer calls `upload({ bucket: "docs", file: { buffer, name, type } })`
- **THEN** the buffer is uploaded with the specified filename and content type

#### Scenario: Upload fails
- **WHEN** upload request fails (network error, server error)
- **THEN** returns `{ data: null, error: { code, message, details } }`

---

### Requirement: File Deletion

The client SHALL provide a `delete` method to delete a single file from storage.

#### Scenario: Delete single file
- **WHEN** developer calls `delete({ bucket: "avatars", key: "users/123/avatar.png" })`
- **THEN** DELETE request is sent to `/{bucket}/files/{encodedKey}`
- **AND** returns `{ data: undefined, error: null }` on success

#### Scenario: Delete non-existent file
- **WHEN** the file does not exist
- **THEN** returns `{ data: null, error: { code: "FILE_NOT_FOUND", ... } }`

---

### Requirement: Bulk File Deletion

The client SHALL provide a `bulkDelete` method to delete multiple files in a single request.

#### Scenario: Delete multiple files
- **WHEN** developer calls `bulkDelete({ bucket: "docs", keys: ["file1.pdf", "file2.pdf"] })`
- **THEN** DELETE request is sent to `/{bucket}/files` with JSON body `{ keys }`
- **AND** returns `{ data: { deleted, failed }, error: null }`

#### Scenario: Partial failure
- **WHEN** some files fail to delete
- **THEN** returns `{ data: { deleted: 1, failed: [{ key, reason }] }, error: null }`

---

### Requirement: Signed URL Generation

The client SHALL provide a `getSignedUrl` method to generate presigned URLs for upload or download.

#### Scenario: Get upload URL
- **WHEN** developer calls `getSignedUrl({ bucket: "uploads", key: "doc.pdf", type: "upload", contentType: "application/pdf" })`
- **THEN** GET request is sent to `/{bucket}/signed-url?key=...&type=upload&contentType=...`
- **AND** returns `{ data: { signedUrl, publicUrl, expiresAt }, error: null }`

#### Scenario: Get download URL
- **WHEN** developer calls `getSignedUrl({ bucket: "uploads", key: "doc.pdf", type: "download" })`
- **THEN** GET request is sent to `/{bucket}/signed-url?key=...&type=download`
- **AND** returns `{ data: { signedUrl, expiresAt }, error: null }`

#### Scenario: Custom expiration
- **WHEN** developer provides `expiresIn: 7200` (2 hours)
- **THEN** the signed URL is valid for the specified duration

---

### Requirement: Health Check

The client SHALL provide a `health` method to check storage provider connectivity.

#### Scenario: Provider is healthy
- **WHEN** developer calls `health()`
- **THEN** GET request is sent to `/health`
- **AND** returns `{ data: { status: "healthy", provider: "minio" }, error: null }`

#### Scenario: Provider is unhealthy
- **WHEN** provider connection fails
- **THEN** returns `{ data: { status: "unhealthy", error: "..." }, error: null }`

---

### Requirement: Error Handling

The client SHALL normalize all errors into a consistent `StorageClientError` format.

#### Scenario: HTTP error response
- **WHEN** server returns 4xx/5xx with Storage Kit error format
- **THEN** error contains `{ code, message, details, status }` from response

#### Scenario: Network error
- **WHEN** fetch fails due to network issues
- **THEN** error contains `{ code: "NETWORK_ERROR", message: "..." }`

#### Scenario: Timeout
- **WHEN** request exceeds configured timeout
- **THEN** error contains `{ code: "REQUEST_TIMEOUT", message: "..." }`

---

### Requirement: TypeScript Types

The package SHALL export TypeScript types for all request parameters and response data.

#### Scenario: Type-safe upload
- **WHEN** developer uses TypeScript
- **THEN** `upload()` parameters are type-checked and response is typed as `Result<UploadResponse>`

#### Scenario: Exported types
- **WHEN** developer imports from "@storage-kit/client"
- **THEN** types like `StorageClientConfig`, `UploadParams`, `UploadResponse`, `StorageClientError` are available
