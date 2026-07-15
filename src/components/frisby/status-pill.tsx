// Pill de status única para lançamentos e faturas. `overdue` tem precedência
// (um PLANNED vencido mostra "Atrasado"; uma fatura CLOSED vencida, "Vencida").

import { cn } from "@/lib/utils";

type PillStatus = "PLANNED" | "SETTLED" | "OPEN" | "CLOSED" | "PARTIAL" | "PAID";

const MAP: Record<PillStatus, { label: string; cls: string }> = {
  PLANNED: { label: "Previsto", cls: "bg-secondary text-muted-foreground" },
  SETTLED: { label: "Baixado", cls: "bg-income/10 text-income" },
  OPEN: { label: "Aberta", cls: "bg-brand-soft text-ink" },
  CLOSED: { label: "Fechada", cls: "bg-secondary text-foreground" },
  PARTIAL: { label: "Parcial", cls: "bg-transfer/10 text-transfer" },
  PAID: { label: "Paga", cls: "bg-income/10 text-income" },
};

interface StatusPillProps {
  status: PillStatus;
  overdue?: boolean;
  className?: string;
}

export function StatusPill({ status, overdue, className }: StatusPillProps) {
  const base = MAP[status];
  const label = overdue ? (status === "PLANNED" ? "Atrasado" : "Vencida") : base.label;
  const cls = overdue ? "bg-expense/10 text-expense" : base.cls;
  return (
    <span
      className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", cls, className)}
    >
      {label}
    </span>
  );
}
