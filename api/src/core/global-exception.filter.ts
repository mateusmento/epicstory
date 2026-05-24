import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    this.logger.error('GlobalExceptionFilter caught exception:', exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const rawResponse = exception.getResponse();
      let payload: Record<string, unknown>;

      if (typeof rawResponse === 'string') {
        message = rawResponse;
        payload = {
          statusCode: status,
          message: rawResponse,
        };
      } else if (
        typeof rawResponse === 'object' &&
        rawResponse !== null &&
        !Array.isArray(rawResponse)
      ) {
        const obj = rawResponse as Record<string, unknown>;
        const nestedMsg = obj['message'];
        message =
          typeof nestedMsg === 'string'
            ? nestedMsg
            : Array.isArray(nestedMsg) &&
                nestedMsg.every((entry) => typeof entry === 'string')
              ? nestedMsg.join('; ')
              : typeof exception.message === 'string'
                ? exception.message
                : 'Error';

        payload = {
          ...obj,
          statusCode: status,
          message,
        };
      } else {
        message = exception.message;
        payload = {
          statusCode: status,
          message: exception.message,
        };
      }

      const errorResponse = {
        timestamp: new Date().toISOString(),
        path: request?.url || 'unknown',
        method: request?.method || 'unknown',
        ...payload,
      };

      this.logger.error(`HTTP Exception: ${status} - ${message}`);

      try {
        response.status(status).json(errorResponse);
      } catch (responseError) {
        this.logger.error('Failed to send error response:', responseError);
      }
      return;
    } else if (exception instanceof QueryFailedError) {
      // Handle database constraint violations and other query errors
      status = HttpStatus.BAD_REQUEST;
      message = exception.message; // Return the raw database error message

      this.logger.error(
        `Database error: ${exception.message}`,
        exception.stack,
      );
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url || 'unknown',
      method: request?.method || 'unknown',
      message,
    };

    this.logger.error(
      `${request?.method || 'unknown'} ${request?.url || 'unknown'} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    try {
      response.status(status).json(errorResponse);
    } catch (responseError) {
      this.logger.error('Failed to send error response:', responseError);
    }
  }
}
