// Criar/editar meta. Prévia ao vivo do aporte mensal necessário: replica no
// cliente a MESMA fórmula do motor do backend — (valor restante) / (meses
// restantes, arredondado pra cima) — para feedback instantâneo enquanto o
// usuário digita. Não existe endpoint de preview: o backend recalcula esse
// mesmo valor (requiredMonthly) ao salvar e o devolve na resposta, que é o
// que passa a valer dali em diante.

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { MoneyText } from "@/components/frisby/money-text";
import { useCreateGoal, useUpdateGoal } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { addMonths, todayISO } from "@/lib/format";
import type { Goal } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Meses restantes até a data-alvo, sempre >= 1 — mesma regra de
 * monthsRemaining() no backend (goal-helpers.ts): evita divisão por
 * zero/negativa quando a meta vence no mês corrente ou já venceu. */
function monthsRemaining(targetDate: string): number {
  const days = (new Date(targetDate).getTime() - new Date(todayISO()).getTime()) / 86_400_000;
  return Math.max(1, Math.ceil(days / 30));
}

/** (targetAmount - currentBalance) / monthsRemaining, arredondado pra cima —
 * mesma fórmula de computeRequiredMonthly() no backend (goal-engine.ts). */
function requiredMonthly(targetAmount: string, currentBalance: string, months: number): string {
  const remaining = BigInt(targetAmount) - BigInt(currentBalance || "0");
  if (remaining <= 0n) return "0";
  return ((remaining + BigInt(months) - 1n) / BigInt(months)).toString();
}

/** `YYYY-MM-DD` daqui a N meses, mesmo dia do mês corrente. */
function dateInMonths(n: number): string {
  return `${addMonths(todayISO().slice(0, 7), n)}-${todayISO().slice(8, 10)}`;
}

interface GoalFormDialogProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal;
}

export function GoalFormDialog({ entityId, open, onOpenChange, goal }: GoalFormDialogProps) {
  const isEdit = !!goal;
  const createGoal = useCreateGoal(entityId);
  const updateGoal = useUpdateGoal(entityId);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dateMode, setDateMode] = useState<"date" | "months">("date");
  const [targetDate, setTargetDate] = useState("");
  const [months, setMonths] = useState("12");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setAmount(goal?.targetAmount ?? "");
    setDateMode("date");
    setTargetDate(goal?.targetDate ?? dateInMonths(12));
    setMonths("12");
    setError(null);
  }, [open, goal]);

  // Alternador "quero em X meses" recalcula a data-alvo automaticamente.
  useEffect(() => {
    if (dateMode !== "months") return;
    const n = Number(months);
    if (Number.isFinite(n) && n > 0) setTargetDate(dateInMonths(n));
  }, [dateMode, months]);

  const preview = useMemo(() => {
    if (!amount || BigInt(amount || "0") <= 0n || !targetDate) return null;
    return requiredMonthly(amount, goal?.currentBalance ?? "0", monthsRemaining(targetDate));
  }, [amount, targetDate, goal?.currentBalance]);

  const pending = createGoal.isPending || updateGoal.isPending;

  const validationError = useMemo((): string | null => {
    if (!name.trim()) return "Dê um nome para a meta.";
    if (!amount || BigInt(amount) <= 0n) return "Informe o valor-alvo.";
    if (!targetDate) return "Informe o prazo.";
    if (new Date(targetDate) <= new Date(todayISO())) return "O prazo precisa ser no futuro.";
    return null;
  }, [name, amount, targetDate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      if (isEdit && goal) {
        await updateGoal.mutateAsync({
          goalId: goal.id,
          name,
          targetAmount: amount,
          targetDate,
        });
        toast.success("Meta atualizada");
      } else {
        await createGoal.mutateAsync({
          name,
          targetAmount: amount,
          currency: "BRL",
          targetDate,
        });
        toast.success("Meta criada");
      }
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title={isEdit ? "Editar meta" : "Nova meta"}
      description="Defina o valor e o prazo — calculamos quanto você precisa guardar por mês."
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label htmlFor="goal-name">Nome</Label>
          <Input
            id="goal-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Viagem para a praia"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal-amount">Valor-alvo</Label>
          <MoneyInput id="goal-amount" value={amount} onChange={setAmount} />
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
          {(
            [
              ["date", "Escolher data"],
              ["months", "Quero em X meses"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setDateMode(id)}
              className={cn(
                "cursor-pointer rounded-lg py-1.5 text-sm font-medium transition-colors",
                dateMode === id ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {dateMode === "date" ? (
          <div className="space-y-1.5">
            <Label>Data-alvo</Label>
            <DatePicker value={targetDate} onChange={setTargetDate} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="goal-months">Em quantos meses?</Label>
            <Input
              id="goal-months"
              type="number"
              min={1}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Prazo calculado: {targetDate || "—"}</p>
          </div>
        )}

        {preview !== null && (
          <div className="rounded-xl border border-brand/30 bg-brand-soft/40 p-3">
            <p className="text-xs text-muted-foreground">Aporte mensal necessário</p>
            <p className="tnum text-lg font-semibold">
              <MoneyText cents={preview} />
              /mês
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
          >
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Salvar" : "Criar meta"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
