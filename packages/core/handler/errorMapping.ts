/**
 * HTTP Error Response Mapping
 *
 * Utilities for mapping StorageError to HTTP responses.
 */

import { StorageError, type StorageErrorCode } from "../providers/storageService";
import type { HttpErrorResponse } from "./types";

/**
 * Map StorageErrorCode to HTTP status code.
 */
const ERROR_STATUS_MAP: Record<StorageErrorCode, number> = {
  // Client errors (4xx)
  BUCKET_NOT_FOUND: 404,
  FILE_NOT_FOUND: 404,
  MISSING_FILE: 400,
  MISSING_REQUIRED_PARAM: 400,
  INVALID_SIGNED_URL_TYPE: 400,
  EMPTY_KEYS_ARRAY: 400,
  KEYS_LIMIT_EXCEEDED: 400,
  PROVIDER_NOT_CONFIGURED: 400,

  // Server errors (5xx)
  UPLOAD_FAILED: 500,
  DELETE_FAILED: 500,
  SIGNED_URL_FAILED: 500,
  PROVIDER_ERROR: 500,
};

/**
 * Convert a StorageError to an HTTP response structure.
 *
 * @param error - The StorageError to convert
 * @returns HTTP response with status code and body
 */
export function mapErrorToResponse(error: StorageError): HttpErrorResponse {
  const status = ERROR_STATUS_MAP[error.code] ?? 500;
  return {
    status,
    body: error.toJSON(),
  };
}

/**
 * Convert any error to an HTTP response structure.
 * Non-StorageError exceptions are wrapped in a generic PROVIDER_ERROR.
 *
 * @param error - The error to convert
 * @returns HTTP response with status code and body
 */
export function mapAnyErrorToResponse(error: unknown): HttpErrorResponse {
  if (error instanceof StorageError) {
    return mapErrorToResponse(error);
  }

  // Wrap unexpected errors in a generic provider error
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";

  const wrappedError = new StorageError("PROVIDER_ERROR", message, {});
  return mapErrorToResponse(wrappedError);
}

/**
 * Check if an error is a StorageError.
 */
export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}
