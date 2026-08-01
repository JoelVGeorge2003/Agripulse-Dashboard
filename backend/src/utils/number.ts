export function parseNassNumber(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized || normalized.startsWith("(")) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function decimalToNumber(value: { toNumber(): number } | null): number | null {
  return value ? value.toNumber() : null;
}
