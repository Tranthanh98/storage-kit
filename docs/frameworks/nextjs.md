# Next.js Integration

While there is no specific `@storage-kit/nextjs` adapter yet, you can easily use `@storage-kit/core` within Next.js API Routes or Server Actions.

## API Route (Pages Router)

```typescript
// pages/api/storage/[[...path]].ts
import { createStorageService } from "@storage-kit/core";
import type { NextApiRequest, NextApiResponse } from "next";

const storage = createStorageService("minio", {
  endpoint: process.env.MINIO_ENDPOINT!,
  accessKeyId: process.env.MINIO_ACCESS_KEY!,
  secretAccessKey: process.env.MINIO_SECRET_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Implement custom handler logic here using storage service
  // Or look out for future Next.js adapters!
  
  if (req.method === 'POST') {
     // Handle upload
  }
}
```

## Server Actions (App Router)

```typescript
// app/actions.ts
'use server'

import { createStorageService } from "@storage-kit/core";

const storage = createStorageService("minio", {
  // config...
});

export async function getUploadUrl(filename: string) {
  return storage.getBucket("my-bucket").getPresignedUploadUrl(filename);
}
```
