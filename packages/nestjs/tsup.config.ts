import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: [
    "@nestjs/common",
    "@nestjs/core",
    "@nestjs/platform-express",
    "@storage-kit/core",
    "reflect-metadata",
    "rxjs",
  ],
});
