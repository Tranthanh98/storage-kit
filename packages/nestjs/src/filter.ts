/**
 * Storage Kit Exception Filter
 *
 * Exception filter for handling StorageError in NestJS.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";
import { StorageError, mapAnyErrorToResponse } from "@storage-kit/core";

/**
 * Exception filter for StorageError.
 *
 * Automatically converts StorageError to appropriate HTTP responses.
 *
 * @example
 * ```typescript
 * // Apply globally
 * app.useGlobalFilters(new StorageErrorFilter());
 *
 * // Apply to controller
 * @UseFilters(new StorageErrorFilter())
 * @Controller("storage")
 * export class StorageController {}
 * ```
 */
@Catch(StorageError)
export class StorageErrorFilter implements ExceptionFilter {
  catch(exception: StorageError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = mapAnyErrorToResponse(exception);
    response.status(status).json(body);
  }
}

/**
 * Global exception filter that handles both StorageError and other exceptions.
 *
 * @example
 * ```typescript
 * app.useGlobalFilters(new AllExceptionsFilter());
 * ```
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof StorageError) {
      const { status, body } = mapAnyErrorToResponse(exception);
      response.status(status).json(body);
    } else if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
    } else {
      const { status, body } = mapAnyErrorToResponse(exception);
      response.status(status).json(body);
    }
  }
}
