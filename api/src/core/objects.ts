import { ClassTransformOptions } from '@nestjs/common/interfaces/external/class-transform-options.interface';
import {
  ClassConstructor,
  plainToClass,
  plainToClassFromExist,
} from 'class-transformer';

export function create<T>(
  ctor: ClassConstructor<T>,
  partial: Partial<T>,
  options: ClassTransformOptions = {},
) {
  return plainToClass(ctor, partial, {
    enableCircularCheck: true,
    ...options,
  });
}

export function patch<T>(instance: T, partial: Partial<T>) {
  return plainToClassFromExist(instance, partial, {
    enableCircularCheck: true,
  });
}
