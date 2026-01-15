# Express Integration

The `@storage-kit/express` adapter allows you to quickly add storage endpoints to your Express application.

## Setup

1. Install dependencies:

   ```bash
   npm install @storage-kit/express express
   ```

2. Initialize and mount:

   ```typescript
   import express from "express";
   import { createStorageKit } from "@storage-kit/express";

   const app = express();
   app.use(express.json());

   // 1. Configure
   const storeKit = createStorageKit({
     provider: "minio",
     endpoint: "http://localhost:9000",
     accessKeyId: "minioadmin",
     secretAccessKey: "minioadmin",
     defaultBucket: "uploads",
   });

   // 2. Mount Routes
   app.use("/api/storage", storeKit.routeHandler());

   app.listen(3000, () => {
     console.log("Server running on http://localhost:3000");
   });
   ```

## Example

Check out the full [Express Example](https://github.com/Tranthanh98/storage-kit/tree/main/examples/express-server).
