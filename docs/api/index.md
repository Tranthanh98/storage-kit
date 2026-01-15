# StorageClient API

The `StorageClient` is used in frontend applications to communicate with your backend storage endpoints.

## Initialization

```typescript
import { createStorageClient } from "@storage-kit/client";

const storage = createStorageClient({
  baseURL: "http://localhost:3000/api/storage",
  headers: { Authorization: `Bearer ${token}` }
});
```

## Methods

### `upload()`

Uploads a file to the specified bucket and path.

```typescript
const { data, error } = await storage.upload({
  bucket: "avatars",
  file: fileObject, // File or Blob
  path: "users/123"
});
```

### `getSignedUrl()`

Requests a presigned URL for uploading or downloading.

```typescript
const { data } = await storage.getSignedUrl({
  bucket: "documents",
  key: "contract.pdf",
  type: "download", // "upload" | "download"
  expiresIn: 3600
});
```

### `delete()`

Deletes a file.

```typescript
await storage.delete({
  bucket: "avatars",
  path: "users/123/old-pic.png"
});
```
