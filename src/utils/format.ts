export function formatNumber(value: number | undefined | null, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "Unknown";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatInteger(value: number): string {
  return value.toLocaleString("en-US");
}

export function atmToPsi(atm: number): number {
  return atm * 14.6959;
}

export function psiToAtm(psi: number): number {
  return psi / 14.6959;
}

export function formatRange(
  min: number | undefined,
  max: number | undefined,
  unit: string,
  digits = 1,
): string {
  if (min === undefined && max === undefined) return "Unknown";
  if (min !== undefined && max !== undefined) {
    if (min === max) return `${formatNumber(min, digits)} ${unit}`;
    return `${formatNumber(min, digits)}–${formatNumber(max, digits)} ${unit}`;
  }
  return `${formatNumber(min ?? max, digits)} ${unit}`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "Not stated";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatPeriod(period: string | undefined): string {
  if (!period) return "Not stated";
  return period.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_, y, m, d) => {
    const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  });
}

export function formatTimestamp(date: Date): string {
  return date.toISOString();
}
