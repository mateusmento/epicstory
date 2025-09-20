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
      message = exception.message;
      this.logger.log(`HTTP Exception: ${status} - ${message}`);
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
