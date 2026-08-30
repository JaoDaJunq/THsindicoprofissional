/** Explicit success/failure, so callers cannot ignore the failure branch. */

export type Result<TValue, TError extends string = string> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError }

export function success<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value }
}

export function failure<TError extends string>(error: TError): Result<never, TError> {
  return { ok: false, error }
}
