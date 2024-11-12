import { ArgumentsHost, Catch, UseFilters } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

export function ExceptionFilter<F extends Error, T extends Error>(
  ...criterias: [{ new (msg: string): F }, { new (msg: string): T }][]
) {
  @Catch()
  class ConvertExceptionFilter<
    F extends Error,
    T extends Error,
  > extends BaseExceptionFilter {
    catch(exception: Error, host: ArgumentsHost): void {
      const convertion = criterias.find(([from]) => exception instanceof from);
      if (convertion) super.catch(new convertion[1](exception.message), host);
      else super.catch(exception, host);
    }
  }

  return UseFilters(ConvertExceptionFilter);
}
