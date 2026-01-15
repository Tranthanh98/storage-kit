# Fastify Integration

<p style="display: flex; gap: 6px; align-items: center;">
  <a href="https://www.npmjs.com/package/@storage-kit/fastify"><img src="https://nodei.co/npm/@storage-kit/fastify.svg?style=shields&data=n,v" alt="npm version" style="border-radius: 6px;"></a>
  <a href="https://github.com/Tranthanh98/storage-kit"><img src="https://img.shields.io/github/stars/Tranthanh98/storage-kit.svg?style=flat-square&colorA=18181b&colorB=28CF8D" alt="GitHub stars" style="border-radius: 6px;"></a>
</p>

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
