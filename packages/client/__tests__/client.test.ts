/**
 * Storage Kit Client Tests
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createStorageClient } from "../src/client";
import { StorageClientError } from "../src/errors";

/**
 * Create a mock fetch function for testing.
 */
function createMockFetch(response: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}) {
  return vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    statusText: response.statusText ?? "OK",
    json: response.json ?? (async () => ({})),
  });
}

describe("createStorageClient", () => {
  it("should create a client instance with all methods", () => {
    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
    });

    expect(client).toBeDefined();
    expect(typeof client.upload).toBe("function");
    expect(typeof client.delete).toBe("function");
    expect(typeof client.bulkDelete).toBe("function");
    expect(typeof client.getSignedUrl).toBe("function");
    expect(typeof client.health).toBe("function");
  });

  it("should throw error if baseURL is not provided", () => {
    expect(() => {
      // @ts-expect-error Testing invalid input
      createStorageClient({});
    }).toThrow("baseURL is required");
  });
});

describe("upload", () => {
  it("should make POST request with FormData", async () => {
    const mockFetch = createMockFetch({
      json: async () => ({ url: "https://cdn.example.com/file.jpg", key: "file.jpg" }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    // Create a mock File
    const file = new File(["test content"], "test.txt", { type: "text/plain" });

    const result = await client.upload({
      bucket: "uploads",
      file,
      path: "documents",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      url: "https://cdn.example.com/file.jpg",
      key: "file.jpg",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/storage/uploads/files",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );
  });

  it("should use default bucket when bucket is '_'", async () => {
    const mockFetch = createMockFetch({
      json: async () => ({ url: "url", key: "key" }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      defaultBucket: "default-bucket",
      fetch: mockFetch,
    });

    const file = new File(["content"], "file.txt", { type: "text/plain" });

    await client.upload({ bucket: "_", file });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/storage/default-bucket/files",
      expect.any(Object)
    );
  });

  it("should return error on HTTP error response", async () => {
    const mockFetch = createMockFetch({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({
        error: {
          code: "BUCKET_NOT_FOUND",
          message: "Bucket not found",
          details: { bucket: "invalid" },
        },
      }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    const file = new File(["content"], "file.txt", { type: "text/plain" });

    const result = await client.upload({ bucket: "invalid", file });

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(StorageClientError);
    expect(result.error?.code).toBe("BUCKET_NOT_FOUND");
    expect(result.error?.status).toBe(404);
  });
});

describe("delete", () => {
  it("should make DELETE request with encoded key", async () => {
    const mockFetch = createMockFetch({
      status: 204,
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    const result = await client.delete({
      bucket: "uploads",
      key: "folder/file.jpg",
    });

    expect(result.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/storage/uploads/files/folder%2Ffile.jpg",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("bulkDelete", () => {
  it("should make DELETE request with JSON body", async () => {
    const mockFetch = createMockFetch({
      json: async () => ({ deleted: 2, failed: [] }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    const result = await client.bulkDelete({
      bucket: "uploads",
      keys: ["file1.jpg", "file2.jpg"],
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ deleted: 2, failed: [] });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/storage/uploads/files",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ keys: ["file1.jpg", "file2.jpg"] }),
      })
    );
  });
});

describe("getSignedUrl", () => {
  it("should make GET request with query params for upload", async () => {
    const mockFetch = createMockFetch({
      json: async () => ({
        signedUrl: "https://s3.example.com/signed",
        publicUrl: "https://cdn.example.com/file.pdf",
        expiresAt: "2024-01-15T12:00:00Z",
      }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    const result = await client.getSignedUrl({
      bucket: "uploads",
      key: "document.pdf",
      type: "upload",
      contentType: "application/pdf",
      expiresIn: 7200,
    });

    expect(result.error).toBeNull();
    expect(result.data?.signedUrl).toBe("https://s3.example.com/signed");

    // Check URL includes query params
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("key=document.pdf");
    expect(calledUrl).toContain("type=upload");
    expect(calledUrl).toContain("contentType=application%2Fpdf");
    expect(calledUrl).toContain("expiresIn=7200");
  });

  it("should make GET request for download URL", async () => {
    const mockFetch = createMockFetch({
      json: async () => ({
        signedUrl: "https://s3.example.com/signed",
        expiresAt: "2024-01-15T12:00:00Z",
      }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    const result = await client.getSignedUrl({
      bucket: "uploads",
      key: "document.pdf",
      type: "download",
    });

    expect(result.error).toBeNull();

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("type=download");
  });
});

describe("health", () => {
  it("should make GET request to /health", async () => {
    const mockFetch = createMockFetch({
      json: async () => ({ status: "healthy", provider: "minio" }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    const result = await client.health();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ status: "healthy", provider: "minio" });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3000/storage/health",
      expect.objectContaining({ method: "GET" })
    );
  });
});

describe("error handling", () => {
  it("should handle network errors", async () => {
    const mockFetch = vi.fn().mockRejectedValue(
      new TypeError("Failed to fetch")
    );

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
    });

    const result = await client.health();

    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(StorageClientError);
    expect(result.error?.code).toBe("NETWORK_ERROR");
  });

  it("should include custom headers in requests", async () => {
    const mockFetch = createMockFetch({
      json: async () => ({ status: "healthy" }),
    });

    const client = createStorageClient({
      baseURL: "http://localhost:3000/storage",
      fetch: mockFetch,
      headers: {
        Authorization: "Bearer test-token",
        "X-Custom-Header": "custom-value",
      },
    });

    await client.health();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "X-Custom-Header": "custom-value",
        }),
      })
    );
  });
});
