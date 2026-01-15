/**
 * Storage Kit Client Utilities
 *
 * Helper functions for URL building, FormData construction, and error handling.
 */

import { StorageClientError, type StorageClientErrorCode } from "./errors";
import type { FileInput, StorageClientConfig } from "./types";

/**
 * Build a URL with query parameters.
 */
export function buildUrl(
  baseURL: string,
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  // Normalize base URL (remove trailing slash)
  const base = baseURL.replace(/\/$/, "");
  // Normalize path (ensure leading slash)
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const url = new URL(`${base}${normalizedPath}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Create FormData from file input.
 */
export function createFormData(
  file: FileInput,
  path?: string,
  contentType?: string
): FormData {
  const formData = new FormData();

  // Handle different file input types
  if (file instanceof File) {
    formData.append("file", file);
  } else if (file instanceof Blob) {
    formData.append("file", file, "file");
  } else {
    // Buffer-based input
    const blob = new Blob([file.buffer], { type: file.type });
    formData.append("file", blob, file.name);
  }

  // Add optional path parameter
  if (path) {
    formData.append("path", path);
  }

  // Add optional content type override
  if (contentType) {
    formData.append("contentType", contentType);
  }

  return formData;
}

/**
 * Parse error response from server.
 */
interface ServerErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Normalize various error types into StorageClientError.
 */
export async function normalizeError(
  error: unknown,
  response?: Response
): Promise<StorageClientError> {
  // Handle abort errors (timeout)
  if (error instanceof DOMException && error.name === "AbortError") {
    return new StorageClientError(
      "REQUEST_TIMEOUT",
      "Request timed out",
      { cause: error }
    );
  }

  // Handle network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new StorageClientError(
      "NETWORK_ERROR",
      "Network request failed",
      { cause: error }
    );
  }

  // Handle response errors
  if (response && !response.ok) {
    try {
      const body = (await response.json()) as ServerErrorResponse;
      if (body.error) {
        return new StorageClientError(
          body.error.code as StorageClientErrorCode,
          body.error.message,
          {
            status: response.status,
            details: body.error.details,
          }
        );
      }
    } catch {
      // Failed to parse error response
    }

    return new StorageClientError(
      "UNKNOWN_ERROR",
      `HTTP ${response.status}: ${response.statusText}`,
      { status: response.status }
    );
  }

  // Handle StorageClientError passthrough
  if (error instanceof StorageClientError) {
    return error;
  }

  // Handle generic errors
  if (error instanceof Error) {
    return new StorageClientError("UNKNOWN_ERROR", error.message, {
      cause: error,
    });
  }

  // Fallback for unknown error types
  return new StorageClientError("UNKNOWN_ERROR", String(error));
}

/**
 * Create fetch function with timeout support.
 */
export function createFetchWithTimeout(
  fetchFn: typeof globalThis.fetch,
  timeout?: number
): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
  if (!timeout) {
    return fetchFn;
  }

  return async (input, init) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetchFn(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Merge headers from config and per-request options.
 */
export function mergeHeaders(
  config: StorageClientConfig,
  requestHeaders?: Record<string, string>
): Record<string, string> {
  return {
    ...config.headers,
    ...requestHeaders,
  };
}

/**
 * Resolve bucket name (handle "_" placeholder).
 */
export function resolveBucket(bucket: string, defaultBucket?: string): string {
  if (bucket === "_" && defaultBucket) {
    return defaultBucket;
  }
  return bucket;
}
