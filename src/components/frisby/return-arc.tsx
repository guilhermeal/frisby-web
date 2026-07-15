import { formatMoney } from "@/lib/money";

interface Props {
  netWorthCents: string;
  /** 0-100 — % of budget used (or planned realized). */
  arcPct: number;
  label: string;
  /** e.g. "R$ 145.230,00 gastos de R$ 4.500,00" */
  sublabel: string;
}

/**
 * The signature "return arc": the one visual flourish of Frisby.
 * A generous SVG orbital ring around the hero net-worth number,
 * whose fill communicates budget consumption for the current month.
 */
export function ReturnArc({ netWorthCents, arcPct, label, sublabel }: Props) {
  const R = 148;
  const C = 2 * Math.PI * R;
  const clamped = Math.max(0, Math.min(100, arcPct));
  // We draw ~78% of a circle (arc), leaving the bottom open.
  const arcSpan = 0.78;
  const trackLen = C * arcSpan;
  const filled = (clamped / 100) * trackLen;

  const state = clamped >= 100 ? "text-expense" : clamped >= 80 ? "text-warning" : "text-brand";

  return (
    <div className="relative mx-auto grid w-full max-w-[420px] place-items-center">
      <svg viewBox="0 0 360 360" className="w-full max-w-[360px] rotate-[-140deg]" aria-hidden>
        <circle
          cx="180"
          cy="180"
          r={R}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${trackLen} ${C}`}
        />
        <circle
          cx="180"
          cy="180"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className={state}
          strokeDasharray={`${filled} ${C}`}
          style={{ transition: "stroke-dasharray 800ms ease-out" }}
        />
        <circle
          cx="180"
          cy="180"
          r={R + 22}
          fill="none"
          stroke="var(--color-brand-soft)"
          strokeWidth="1"
          strokeDasharray="2 8"
          opacity="0.6"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-4xl font-semibold tnum sm:text-5xl md:text-6xl">
            {formatMoney(netWorthCents)}
          </p>
          <p className="mt-3 text-xs text-muted-foreground sm:text-sm">{sublabel}</p>
        </div>
      </div>
    </div>
  );
}
