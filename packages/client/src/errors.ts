/**
 * Storage Kit Client Errors
 *
 * Error class for client-side storage operations.
 */

/**
 * Error codes that can be returned by the client.
 */
export type StorageClientErrorCode =
  // Server error codes (from Storage Kit API)
  | "BUCKET_NOT_FOUND"
  | "FILE_NOT_FOUND"
  | "MISSING_FILE"
  | "MISSING_REQUIRED_PARAM"
  | "INVALID_SIGNED_URL_TYPE"
  | "EMPTY_KEYS_ARRAY"
  | "KEYS_LIMIT_EXCEEDED"
  | "UPLOAD_FAILED"
  | "DELETE_FAILED"
  | "SIGNED_URL_FAILED"
  | "PROVIDER_ERROR"
  // Client-specific error codes
  | "NETWORK_ERROR"
  | "REQUEST_TIMEOUT"
  | "INVALID_RESPONSE"
  | "UNKNOWN_ERROR";

/**
 * Error class for Storage Kit client operations.
 * Provides consistent error format for all client methods.
 */
export class StorageClientError extends Error {
  /** Error code identifying the type of error */
  readonly code: StorageClientErrorCode;
  /** HTTP status code (if applicable) */
  readonly status?: number;
  /** Additional error details */
  readonly details: Record<string, unknown>;

  constructor(
    code: StorageClientErrorCode,
    message: string,
    options?: {
      status?: number;
      details?: Record<string, unknown>;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "StorageClientError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details ?? {};
  }

  /**
   * Convert to JSON format for logging/serialization.
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}
