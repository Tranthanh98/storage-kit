/**
 * Storage Kit Client
 *
 * Factory function to create a configured Storage Kit client instance.
 */

import type {
  BulkDeleteParams,
  BulkDeleteResponse,
  DeleteParams,
  FetchOptions,
  HealthResponse,
  Result,
  SignedUrlParams,
  SignedUrlResponse,
  StorageClient,
  StorageClientConfig,
  UploadParams,
  UploadResponse,
} from "./types";
import {
  buildUrl,
  createFetchWithTimeout,
  createFormData,
  mergeHeaders,
  normalizeError,
  resolveBucket,
} from "./utils";

/**
 * Default timeout for requests (30 seconds).
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Create a Storage Kit client instance.
 *
 * @param config - Client configuration options
 * @returns A configured StorageClient instance
 *
 * @example
 * ```typescript
 * import { createStorageClient } from "@storage-kit/client";
 *
 * const storage = createStorageClient({
 *   baseURL: "http://localhost:3000/storage",
 *   headers: { Authorization: `Bearer ${token}` },
 * });
 *
 * const { data, error } = await storage.upload({
 *   bucket: "avatars",
 *   file: file,
 *   path: "users/123",
 * });
 * ```
 */
export function createStorageClient(config: StorageClientConfig): StorageClient {
  // Validate required config
  if (!config.baseURL) {
    throw new Error("baseURL is required in StorageClientConfig");
  }

  // Get fetch implementation (use global fetch if not provided)
  const baseFetch = config.fetch ?? globalThis.fetch;
  const timeout = config.timeout ?? DEFAULT_TIMEOUT;

  /**
   * Make a request with error handling and result wrapping.
   */
  async function request<T>(
    method: string,
    url: string,
    options: FetchOptions & {
      body?: FormData | string;
      headers?: Record<string, string>;
    } = {}
  ): Promise<Result<T>> {
    const requestTimeout = options.timeout ?? timeout;
    const fetchWithTimeout = createFetchWithTimeout(baseFetch, requestTimeout);

    const headers = mergeHeaders(config, options.headers);

    try {
      const response = await fetchWithTimeout(url, {
        method,
        headers,
        body: options.body,
        signal: options.signal,
      });

      if (!response.ok) {
        const error = await normalizeError(null, response);
        return { data: null, error };
      }

      // Handle 204 No Content (for delete operations)
      if (response.status === 204) {
        return { data: undefined as T, error: null };
      }

      const data = (await response.json()) as T;
      return { data, error: null };
    } catch (err) {
      const error = await normalizeError(err);
      return { data: null, error };
    }
  }

  /**
   * Upload a file to storage.
   */
  async function upload(
    params: UploadParams,
    options?: FetchOptions
  ): Promise<Result<UploadResponse>> {
    const bucket = resolveBucket(params.bucket, config.defaultBucket);
    const url = buildUrl(config.baseURL, `/${bucket}/files`);
    const formData = createFormData(params.file, params.path, params.contentType);

    return request<UploadResponse>("POST", url, {
      ...options,
      body: formData,
    });
  }

  /**
   * Delete a single file from storage.
   */
  async function deleteFile(
    params: DeleteParams,
    options?: FetchOptions
  ): Promise<Result<void>> {
    const bucket = resolveBucket(params.bucket, config.defaultBucket);
    // URL-encode the key to handle paths with slashes
    const encodedKey = encodeURIComponent(params.key);
    const url = buildUrl(config.baseURL, `/${bucket}/files/${encodedKey}`);

    return request<void>("DELETE", url, options);
  }

  /**
   * Delete multiple files from storage.
   */
  async function bulkDelete(
    params: BulkDeleteParams,
    options?: FetchOptions
  ): Promise<Result<BulkDeleteResponse>> {
    const bucket = resolveBucket(params.bucket, config.defaultBucket);
    const url = buildUrl(config.baseURL, `/${bucket}/files`);

    return request<BulkDeleteResponse>("DELETE", url, {
      ...options,
      headers: {
        ...options?.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys: params.keys }),
    });
  }

  /**
   * Generate a presigned URL for upload or download.
   */
  async function getSignedUrl(
    params: SignedUrlParams,
    options?: FetchOptions
  ): Promise<Result<SignedUrlResponse>> {
    const bucket = resolveBucket(params.bucket, config.defaultBucket);
    const url = buildUrl(config.baseURL, `/${bucket}/signed-url`, {
      key: params.key,
      type: params.type,
      expiresIn: params.expiresIn,
      contentType: params.contentType,
    });

    return request<SignedUrlResponse>("GET", url, options);
  }

  /**
   * Check storage provider health.
   */
  async function health(options?: FetchOptions): Promise<Result<HealthResponse>> {
    const url = buildUrl(config.baseURL, "/health");
    return request<HealthResponse>("GET", url, options);
  }

  // Return the client object with all methods
  return {
    upload,
    delete: deleteFile,
    bulkDelete,
    getSignedUrl,
    health,
  };
}
