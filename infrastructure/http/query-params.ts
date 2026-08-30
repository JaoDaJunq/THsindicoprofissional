/** Shared by every listing query: a page number that is not a positive integer is ignored. */
export function readNumber(raw: string | null, fallback: number): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
