import { Constructor } from '@nestjs/cqrs';
import { plainToClass, plainToClassFromExist } from 'class-transformer';

export function create<T>(ctor: Constructor<T>, partial: Partial<T>) {
  return plainToClass(ctor, partial, {
    enableCircularCheck: true,
    enableImplicitConversion: true,
  });
}

export function patch<T>(dest: T, src: Partial<T>) {
  return plainToClassFromExist(dest, src);
}
