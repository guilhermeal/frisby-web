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

/**
 * Data de HOJE como `YYYY-MM-DD` no fuso LOCAL do usuário — para defaults de
 * formulário (competência, baixa). Nunca usar toISOString().slice() aqui: à
 * noite no Brasil o UTC já virou o dia seguinte.
 */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Soma meses a um `YYYY-MM` (delta pode ser negativo). */
export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
