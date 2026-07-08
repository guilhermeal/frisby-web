// Datas ISO curtas (YYYY-MM-DD) representam competência sem hora — formatamos
// SEMPRE em UTC para evitar mismatch de hidratação (servidor em UTC vs
// navegador em fuso local, ex.: "2026-09-18" vira "17 de set" em pt-BR).

export function formatDate(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatLongDate(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatMonth(iso: string, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** `YYYY-MM` do mês corrente, útil para chaves de query. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
