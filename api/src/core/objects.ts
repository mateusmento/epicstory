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

export function groupBy<T>(
  array: T[],
  key: keyof T,
): Record<string | number, T[]> {
  const map = new Map<T[keyof T], T[]>();
  for (const item of array) {
    const keyValue = item[key];
    if (!map.has(keyValue)) {
      map.set(keyValue, []);
    }
    map.get(keyValue)?.push(item);
  }
  return Object.fromEntries(map.entries());
}

export function mapBy<T, K extends keyof T>(
  array: T[],
  key: K,
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();
  for (const item of array) {
    const keyValue = item[key];
    if (!map.has(keyValue)) {
      map.set(keyValue, []);
    }
    map.get(keyValue)?.push(item);
  }
  return map;
}
