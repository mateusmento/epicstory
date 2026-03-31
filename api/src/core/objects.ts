import { ClassTransformOptions } from '@nestjs/common/interfaces/external/class-transform-options.interface';
import {
  ClassConstructor,
  plainToClass,
  plainToClassFromExist,
} from 'class-transformer';
import { pick, uniq } from 'lodash';
import { getMetadataArgsStorage } from 'typeorm';

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

/**
 * Patches only known fields from a TypeORM entity instance:
 * - column + relation property names + existing enumerable keys on the instance
 */
export function patchEntity<T extends object>(
  instance: T,
  partial: Partial<T>,
) {
  return plainToClassFromExist(instance, pickEntityKeys(instance, partial), {
    enableCircularCheck: true,
  });
}

type AnyCtor = abstract new (...args: any[]) => any;

function getCtorChain(instance: object): AnyCtor[] {
  const chain: AnyCtor[] = [];
  let ctor: AnyCtor | null = (instance as any)?.constructor ?? null;

  while (ctor && ctor !== (Object as unknown as AnyCtor)) {
    chain.push(ctor);
    const proto = (ctor as any)?.prototype
      ? Object.getPrototypeOf((ctor as any).prototype)
      : null;
    ctor = (proto?.constructor as AnyCtor | undefined) ?? null;
  }

  return chain;
}

function pickEntityKeys<T extends object>(
  instance: T,
  partial: Partial<T>,
): Partial<T> {
  function fetchTypeOrmKeys(instance: T) {
    const storage = getMetadataArgsStorage();
    const targets = new Set(getCtorChain(instance));
    const columns = storage.columns
      .filter(
        (c) =>
          typeof c.target === 'function' && targets.has(c.target as AnyCtor),
      )
      .map((c) => c.propertyName);
    const relations = storage.relations
      .filter(
        (r) =>
          typeof r.target === 'function' && targets.has(r.target as AnyCtor),
      )
      .map((r) => r.propertyName);
    return uniq([...columns, ...relations]);
  }

  const keys = fetchTypeOrmKeys(instance).concat(Object.keys(instance));

  if (keys.length === 0) return {};

  return pick(partial, keys) as Partial<T>;
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

export function mapBy<T, K extends keyof T>(array: T[], key: K): Map<T[K], T> {
  return new Map(array.map((item) => [item[key], item]));
}
