import {
  ClassConstructor,
  plainToClass,
  plainToClassFromExist,
} from 'class-transformer';

export function create<T>(ctor: ClassConstructor<T>, partial: Partial<T>) {
  return plainToClass(ctor, partial, {
    enableCircularCheck: true,
  });
}

export function patch<T>(instance: T, partial: Partial<T>) {
  return plainToClassFromExist(instance, partial, {
    enableCircularCheck: true,
  });
}
