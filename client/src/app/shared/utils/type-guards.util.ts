export type UnknownRecord = Record<string, unknown>;
export type Augmented<TBase, TExtension> = TBase & TExtension;
export type Either<TLeft, TRight> = TLeft | TRight;
export type Nullable<T> = T | null;
export type Nullish<T> = T | null | undefined;

const UNSAFE_DYNAMIC_PROPERTY_KEYS = new Set<PropertyKey>([
  '__proto__',
  'constructor',
  'prototype',
]);

function isSafeDynamicPropertyKey(key: PropertyKey): boolean {
  return !UNSAFE_DYNAMIC_PROPERTY_KEYS.has(key);
}

type OwnPropertyValue<TTarget, TKey extends keyof NonNullable<TTarget>> = [TTarget] extends [NonNullable<TTarget>]
  ? NonNullable<TTarget>[TKey]
  : NonNullable<TTarget>[TKey] | undefined;

export function getOwnProperty<TTarget, TKey extends keyof NonNullable<TTarget>>(target: TTarget, key: TKey): OwnPropertyValue<TTarget, TKey> {
  if (target === null || target === undefined || !isSafeDynamicPropertyKey(key)) {
    return undefined as OwnPropertyValue<TTarget, TKey>;
  }

  const boxedTarget = Object(target);
  return (Object.hasOwn(boxedTarget, key) ? Reflect.get(boxedTarget, key) : undefined) as OwnPropertyValue<TTarget, TKey>;
}

export function setOwnProperty<TTarget extends object, TKey extends keyof TTarget>(target: TTarget, key: TKey, value: TTarget[TKey]): TTarget[TKey] {
  if (!isSafeDynamicPropertyKey(key)) {
    throw new TypeError(`Unsafe dynamic property key: ${String(key)}`);
  }

  const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
  if (descriptor && 'set' in descriptor) {
    if (!descriptor.set) {
      throw new TypeError(`Unable to set dynamic property: ${String(key)}`);
    }
    if (!Reflect.set(target, key, value, target)) {
      throw new TypeError(`Unable to set dynamic property: ${String(key)}`);
    }
    return value;
  }

  const updated = Reflect.defineProperty(target, key, descriptor ? { ...descriptor, value } : { configurable: true, enumerable: true, value, writable: true });
  if (!updated) {
    throw new TypeError(`Unable to set dynamic property: ${String(key)}`);
  }
  return value;
}

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asUnknownRecord(value: unknown): UnknownRecord {
  return isUnknownRecord(value) ? value : {};
}

export function readUnknownRecord(value: unknown, key: string): UnknownRecord {
  return asUnknownRecord(getOwnProperty(asUnknownRecord(value), key));
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
