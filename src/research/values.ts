import type { Value } from './types';
export const UNDEFINED: Value = { $repro: 'undefined' };
export const isUndefined = (value: unknown) => typeof value === 'object' && value !== null && Object.keys(value).length === 1 && (value as Record<string, unknown>).$repro === 'undefined';
export const nullish = (value: unknown) => value === null || value === undefined || isUndefined(value);
export const truthy = (value: Value) => !isUndefined(value) && Boolean(value);
export function valueText(value: unknown): string { return value === undefined || isUndefined(value) ? 'undefined' : typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value); }
export function isModeledValue(value: unknown, depth = 0): value is Value {
  if (depth > 8) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 512;
  if (typeof value !== 'object') return false;
  const values = Object.values(value);
  return values.length <= 64 && values.every(child => isModeledValue(child, depth + 1));
}
