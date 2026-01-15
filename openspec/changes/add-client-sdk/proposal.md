# Change: Add Client SDK Package (@storage-kit/client)

## Why

Currently, frontend applications (React, React Native, Vue, Angular) that want to interact with Storage Kit must manually implement HTTP API calls. This creates:

- **Boilerplate code**: Every project needs to write similar fetch/axios calls for upload, delete, and signed URL generation
- **Inconsistent error handling**: Different apps handle errors differently without a standard pattern
- **No TypeScript support**: Manual implementations lack proper typing for requests and responses
- **No convenience utilities**: Missing helpers for common patterns like FormData construction, progress tracking, and URL building

Similar to how `better-auth/client` provides a ready-to-use client for authentication, `@storage-kit/client` will provide a zero-config client SDK that works with any Storage Kit server deployment.

## What Changes

### New Package

**`@storage-kit/client`** - A framework-agnostic TypeScript client SDK for Storage Kit with:

- **`createStorageClient(config)`** - Factory function to create a configured client instance
- **File Upload API** - `client.upload({ bucket, file, path?, contentType? })`
- **File Deletion API** - `client.delete({ bucket, key })`
- **Bulk Delete API** - `client.bulkDelete({ bucket, keys })`
- **Signed URL API** - `client.getSignedUrl({ bucket, key, type, expiresIn?, contentType? })`
- **Health Check API** - `client.health()`

### API Design Principles

- **Promise-based**: All methods return typed promises with `{ data, error }` pattern
- **Type-safe**: Full TypeScript support with exported request/response types
- **Configurable fetch**: Allow custom fetch implementation for React Native, Node.js, or test mocking
- **Error normalization**: Convert HTTP errors to typed `StorageClientError` objects
- **Zero dependencies**: Uses native fetch API (or user-provided implementation)

### Package Structure

```
packages/client/
├── src/
│   ├── index.ts           # Main exports
│   ├── client.ts          # createStorageClient factory
│   ├── types.ts           # Request/response types
│   ├── errors.ts          # StorageClientError class
│   └── utils.ts           # URL building, FormData helpers
├── package.json
├── tsconfig.json
└── README.md
```

## Impact

- **Affected specs**: None (new capability)
- **Affected code**: None (new package, no changes to existing packages)
- **New files**:
  - `packages/client/` - New package directory
  - Client implementation, types, and utilities
- **Dependencies**:
  - Relies on Storage Kit HTTP API defined in `define-storage-api`
  - No runtime dependencies (uses native fetch)
