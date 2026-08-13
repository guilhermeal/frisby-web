// Criar/editar meta. Prévia ao vivo do aporte mensal necessário: replica a
// fórmula simples (valor restante / meses restantes) no cliente para feedback
// instantâneo enquanto o usuário digita, e confirma com o backend (debounced)
// antes de salvar — o backend é sempre a fonte de verdade do valor final.

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { MoneyText } from "@/components/frisby/money-text";
import { useCreateGoal, useGoalPreview, useUpdateGoal } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { addMonths, todayISO } from "@/lib/format";
import type { Goal, GoalCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS: Array<{ value: GoalCategory; label: string }> = [
  { value: "RESERVE", label: "Reserva de emergência" },
  { value: "TRIP", label: "Viagem" },
  { value: "VEHICLE", label: "Veículo" },
  { value: "PROPERTY", label: "Imóvel" },
  { value: "EDUCATION", label: "Educação" },
  { value: "OTHER", label: "Outro" },
];

/** Meses inteiros entre hoje e a data-alvo (mínimo 1, para não dividir por zero). */
function monthsUntil(targetDate: string): number {
  const today = new Date(todayISO());
  const target = new Date(targetDate);
  const months =
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return Math.max(1, months);
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
  const preview = useGoalPreview(entityId);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<GoalCategory>("RESERVE");
  const [amount, setAmount] = useState("");
  const [dateMode, setDateMode] = useState<"date" | "months">("date");
  const [targetDate, setTargetDate] = useState("");
  const [months, setMonths] = useState("12");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setCategory(goal?.category ?? "RESERVE");
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

  // Prévia local instantânea (mesma fórmula simples do backend: valor
  // restante dividido pelos meses restantes) — atualiza a cada tecla.
  const localPreview = useMemo(() => {
    if (!amount || !targetDate || BigInt(amount || "0") <= 0n) return null;
    const remaining = BigInt(amount) - BigInt(goal?.currentAmount ?? "0");
    if (remaining <= 0n) return "0";
    const n = monthsUntil(targetDate);
    return (remaining / BigInt(n)).toString();
  }, [amount, targetDate, goal?.currentAmount]);

  // Confirmação com o backend, debounced — só quando os valores mudam e são
  // válidos. O valor exibido prioriza a resposta do servidor quando chega.
  useEffect(() => {
    if (!open || !entityId || !amount || !targetDate || BigInt(amount || "0") <= 0n) return;
    const t = setTimeout(() => {
      preview.mutate({ targetAmount: amount, targetDate });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityId, amount, targetDate]);

  const displayedRequired = preview.data?.requiredMonthlyContribution ?? localPreview;

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
          category,
          targetAmount: amount,
          targetDate,
        });
        toast.success("Meta atualizada");
      } else {
        await createGoal.mutateAsync({
          name,
          category,
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
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {displayedRequired !== null && (
          <div className="rounded-xl border border-brand/30 bg-brand-soft/40 p-3">
            <p className="text-xs text-muted-foreground">Aporte mensal necessário</p>
            <p className="tnum text-lg font-semibold">
              <MoneyText cents={displayedRequired} />
              /mês
            </p>
            {preview.isPending && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Confirmando com o servidor…
              </p>
            )}
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
