# Fastify Integration

Use the `@storage-kit/fastify` plugin.

## Setup

```bash
npm install @storage-kit/fastify fastify
```

## Usage

```typescript
import Fastify from "fastify";
import { createStorageKit } from "@storage-kit/fastify";

const fastify = Fastify();

const storeKit = createStorageKit({
  provider: "minio",
  endpoint: "http://localhost:9000",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  defaultBucket: "my-bucket",
});

fastify.register(storeKit.plugin(), { prefix: "/api/storage" });

fastify.listen({ port: 3000 });
```
