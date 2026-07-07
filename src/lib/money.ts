// Money layer — API sends integer cents as STRINGS. Never floats.

export type Currency = "BRL" | "USD" | "EUR" | "JPY";

const DECIMALS: Record<Currency, number> = { BRL: 2, USD: 2, EUR: 2, JPY: 0 };

export function centsToNumber(cents: string | bigint, currency: Currency = "BRL"): number {
  const n = typeof cents === "bigint" ? cents : BigInt(cents);
  const divisor = 10 ** DECIMALS[currency];
  return Number(n) / divisor;
}

export function formatMoney(
  cents: string | bigint,
  currency: Currency = "BRL",
  locale = "pt-BR",
  opts: { sign?: boolean } = {},
): string {
  const value = centsToNumber(cents, currency);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: DECIMALS[currency],
    maximumFractionDigits: DECIMALS[currency],
  }).format(Math.abs(value));
  if (opts.sign) {
    if (value > 0) return `+ ${formatted}`;
    if (value < 0) return `− ${formatted}`;
  }
  return value < 0 ? `− ${formatted}` : formatted;
}

export function addCents(a: string, b: string): string {
  return (BigInt(a) + BigInt(b)).toString();
}

export function subCents(a: string, b: string): string {
  return (BigInt(a) - BigInt(b)).toString();
}

export function pct(part: string, total: string): number {
  if (total === "0") return 0;
  const p = Number((BigInt(part) * 10000n) / BigInt(total)) / 100;
  return Math.max(0, p);
}
