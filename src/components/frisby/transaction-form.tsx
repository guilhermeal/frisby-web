// Formulário de lançamento — o fluxo central do produto.
// Ordem do gesto: valor → tipo → origem → categoria → data → status → escopo.
// Regras que este form NUNCA viola (Apêndice B do manual):
//  - origem CARTÃO trava o status em PLANNED (compra vai para a fatura, nunca baixa caixa);
//  - SETTLED exige conta e data de baixa;
//  - rateio MEMBERS só salva com soma exata;
//  - "Repetir" e "Parcelar" são mutuamente exclusivos e usam os módulos
//    próprios do backend (recurrences / installments).

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
import { Switch } from "@/components/ui/switch";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { AccountSelect } from "@/components/frisby/account-select";
import { CategorySelect } from "@/components/frisby/category-select";
import { SplitBuilder, sharesSumOk, type Share } from "@/components/frisby/split-builder";
import { AttachmentUploader } from "@/components/frisby/attachment-uploader";
import {
  useCreateInstallments,
  useCreateRecurrence,
  useCreateTransaction,
  useMembers,
  useUpdateTransaction,
} from "@/hooks/api";
import { apiErrorMessage, apiFieldErrors } from "@/lib/api/error-messages";
import { formatMoney } from "@/lib/money";
import { formatDate, formatMonth, todayISO } from "@/lib/format";
import type { Account, Transaction, TxScope, TxStatus, TxType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type ExtraMode = "single" | "repeat" | "installments";
type RecurrenceInterval = "WEEKLY" | "MONTHLY" | "YEARLY";

/** Mês da fatura em que uma compra cai, dado o dia de fechamento do cartão. */
function invoiceMonthFor(competenceDate: string, closingDay: number): string {
  const [y, m, d] = competenceDate.split("-").map(Number);
  const next = d > closingDay ? new Date(Date.UTC(y, m, 1)) : new Date(Date.UTC(y, m - 1, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Próximas N datas de uma recorrência (prévia; o cálculo oficial é do backend). */
function previewDates(startDate: string, interval: RecurrenceInterval, n: number): string[] {
  const [y, m, d] = startDate.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    let date: Date;
    if (interval === "WEEKLY") date = new Date(Date.UTC(y, m - 1, d + 7 * i));
    else if (interval === "YEARLY") date = new Date(Date.UTC(y + i, m - 1, d));
    else {
      // MONTHLY com clamp para o último dia do mês
      const lastDay = new Date(Date.UTC(y, m + i, 0)).getUTCDate();
      date = new Date(Date.UTC(y, m - 1 + i, Math.min(d, lastDay)));
    }
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

/** Prévia das parcelas: base + resto na última (mesma regra do backend). */
function previewInstallments(total: string, n: number): { per: string; last: string } {
  const totalBig = BigInt(total || "0");
  const per = totalBig / BigInt(n);
  const last = totalBig - per * BigInt(n - 1);
  return { per: per.toString(), last: last.toString() };
}

/** Converte rateio por valor → ratios (0..1, soma exata 1) para recorrências. */
function sharesToRatios(
  shares: Share[],
  total: string,
): Array<{ memberId: string; shareRatio: number }> {
  const totalNum = Number(total);
  let acc = 0;
  return shares.map((s, i) => {
    if (i === shares.length - 1) {
      return { memberId: s.memberId, shareRatio: Number((1 - acc).toFixed(6)) };
    }
    const ratio = Number((Number(s.shareAmount) / totalNum).toFixed(6));
    acc += ratio;
    return { memberId: s.memberId, shareRatio: ratio };
  });
}

interface TransactionFormProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tipo inicial (FAB "Despesa"/"Receita"). */
  defaultType?: TxType;
  /** Presente = modo edição (PATCH). */
  transaction?: Transaction;
}

export function TransactionForm({
  entityId,
  open,
  onOpenChange,
  defaultType = "EXPENSE",
  transaction,
}: TransactionFormProps) {
  const isEdit = !!transaction;
  const membersQ = useMembers(entityId);
  const createTx = useCreateTransaction(entityId);
  const updateTx = useUpdateTransaction(entityId);
  const createRecurrence = useCreateRecurrence(entityId);
  const createInstallments = useCreateInstallments(entityId);

  // ---------- estado ----------
  const [type, setType] = useState<TxType>(defaultType);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [account, setAccount] = useState<Account | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [competenceDate, setCompetenceDate] = useState(todayISO());
  const [status, setStatus] = useState<TxStatus>("PLANNED");
  const [settlementDate, setSettlementDate] = useState(todayISO());
  const [scope, setScope] = useState<TxScope>("ENTITY");
  const [shares, setShares] = useState<Share[]>([]);
  const [description, setDescription] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [mode, setMode] = useState<ExtraMode>("single");
  const [interval, setInterval] = useState<RecurrenceInterval>("MONTHLY");
  const [forever, setForever] = useState(false);
  const [occurrences, setOccurrences] = useState(12);
  const [installmentTotal, setInstallmentTotal] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset/prefill ao abrir.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount);
      setAccountId(transaction.accountId ?? undefined);
      setAccount(undefined);
      setCategoryId(transaction.categoryId || undefined);
      setCompetenceDate(transaction.competenceDate);
      setStatus(transaction.status);
      setScope(transaction.scope);
      setShares(transaction.shares ?? []);
      setDescription(transaction.description);
      setPayeeName(transaction.payeeName ?? "");
      setMode("single");
    } else {
      setType(defaultType);
      setAmount("");
      setAccountId(undefined);
      setAccount(undefined);
      setCategoryId(undefined);
      setCompetenceDate(todayISO());
      setStatus("PLANNED");
      setSettlementDate(todayISO());
      setScope("ENTITY");
      setShares([]);
      setDescription("");
      setPayeeName("");
      setMode("single");
      setInterval("MONTHLY");
      setForever(false);
      setOccurrences(12);
      setInstallmentTotal(2);
    }
  }, [open, transaction, defaultType]);

  const isCard = account?.type === "CREDIT_CARD";

  // Cartão nunca baixa caixa — trava PLANNED (invariante 3).
  useEffect(() => {
    if (isCard) setStatus("PLANNED");
  }, [isCard]);

  // Trocar o tipo invalida a categoria (tipos não se misturam).
  function changeType(next: TxType) {
    setType(next);
    setCategoryId(undefined);
  }

  const pending =
    createTx.isPending ||
    updateTx.isPending ||
    createRecurrence.isPending ||
    createInstallments.isPending;

  // ---------- validação ----------
  const validationError = useMemo((): string | null => {
    if (!amount || BigInt(amount) === 0n) return "Informe o valor.";
    if (!categoryId) return "Escolha uma categoria.";
    if (!competenceDate) return "Informe a data.";
    if (status === "SETTLED" && !accountId) return "Lançamento baixado exige uma conta.";
    if (scope === "MEMBERS" && !sharesSumOk(shares, amount))
      return "O rateio precisa fechar exatamente com o valor.";
    if (mode === "installments" && !accountId) return "Parcelamento exige uma conta (o cartão).";
    if (mode === "installments" && (installmentTotal < 2 || installmentTotal > 60))
      return "Parcelas: entre 2 e 60.";
    return null;
  }, [
    amount,
    categoryId,
    competenceDate,
    status,
    accountId,
    scope,
    shares,
    mode,
    installmentTotal,
  ]);

  // ---------- submissão ----------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFieldErrors({});
    try {
      if (isEdit && transaction) {
        await updateTx.mutateAsync({
          id: transaction.id,
          body: {
            description,
            payeeName: payeeName || undefined,
            categoryId,
            accountId: accountId ?? null,
            amount,
            competenceDate,
            scope,
            shares: scope === "MEMBERS" ? shares : undefined,
          },
        });
        toast.success("Lançamento atualizado");
      } else if (mode === "installments") {
        await createInstallments.mutateAsync({
          type,
          totalAmount: amount,
          installmentTotal,
          firstCompetenceDate: competenceDate,
          accountId: accountId!,
          categoryId: categoryId!,
          description: description || undefined,
          payeeName: payeeName || undefined,
          scope,
          shares: scope === "MEMBERS" ? shares : undefined,
        });
        toast.success(`Compra parcelada em ${installmentTotal}x criada`);
      } else if (mode === "repeat") {
        await createRecurrence.mutateAsync({
          type,
          accountId,
          categoryId: categoryId!,
          amount,
          description: description || undefined,
          scope,
          shares: scope === "MEMBERS" ? sharesToRatios(shares, amount) : undefined,
          interval,
          dayOfPeriod: interval === "MONTHLY" ? Number(competenceDate.slice(8, 10)) : undefined,
          startDate: competenceDate,
          occurrences: forever ? null : occurrences,
        });
        toast.success("Recorrência criada");
      } else {
        await createTx.mutateAsync({
          type,
          amount,
          accountId: accountId ?? null,
          categoryId,
          competenceDate,
          status,
          settlementDate: status === "SETTLED" ? settlementDate : undefined,
          scope,
          shares: scope === "MEMBERS" ? shares : undefined,
          description,
          payeeName: payeeName || undefined,
        });
        toast.success(status === "SETTLED" ? "Lançamento baixado" : "Lançamento previsto criado");
      }
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
      setFieldErrors(apiFieldErrors(err));
    }
  }

  const installmentPreview =
    mode === "installments" && amount ? previewInstallments(amount, installmentTotal) : null;
  const recurrencePreview = mode === "repeat" ? previewDates(competenceDate, interval, 3) : null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title={isEdit ? "Editar lançamento" : type === "EXPENSE" ? "Nova despesa" : "Nova receita"}
      description={
        isEdit && (transaction?.installment || transaction?.recurrence)
          ? "Este item pertence a um grupo (parcelas/recorrência) — a edição vale só para ele."
          : undefined
      }
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        {/* Valor + tipo */}
        <div className="space-y-1.5">
          <Label htmlFor="tx-amount">
            Valor{" "}
            {isEdit && (
              <span className="font-normal text-muted-foreground">
                (use o sinal − para registrar um estorno)
              </span>
            )}
          </Label>
          <MoneyInput
            id="tx-amount"
            value={amount}
            onChange={setAmount}
            autoFocus
            allowNegative
            className="h-12 text-xl"
          />
          {fieldErrors.amount && <p className="text-xs text-expense">{fieldErrors.amount}</p>}
        </div>

        {!isEdit && (
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
            {(
              [
                ["EXPENSE", "Despesa"],
                ["INCOME", "Receita"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => changeType(id)}
                className={cn(
                  "cursor-pointer rounded-lg py-1.5 text-sm font-medium transition-colors",
                  type === id ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Origem */}
        <div className="space-y-1.5">
          <Label>
            {type === "EXPENSE" ? "Pago com" : "Recebido em"}{" "}
            <span className="font-normal text-muted-foreground">
              {status === "PLANNED" && !isCard ? "(opcional no previsto)" : ""}
            </span>
          </Label>
          <AccountSelect
            entityId={entityId}
            value={accountId}
            onChange={(id, acc) => {
              setAccountId(id);
              setAccount(acc);
            }}
            placeholder="Definir depois"
          />
          {isCard && account?.closingDay && (
            <p className="rounded-lg bg-brand-soft/50 px-2.5 py-1.5 text-xs text-ink">
              Compra no cartão — entra na fatura de{" "}
              <strong className="capitalize">
                {formatMonth(`${invoiceMonthFor(competenceDate, account.closingDay)}-01`)}
              </strong>
              . Não movimenta o caixa agora.
            </p>
          )}
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <CategorySelect
            entityId={entityId}
            type={type}
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        {/* Data */}
        <div className="space-y-1.5">
          <Label>Data de competência</Label>
          <DatePicker value={competenceDate} onChange={setCompetenceDate} />
        </div>

        {/* Status (oculto para cartão e para modos repetir/parcelar) */}
        {!isCard && mode === "single" && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
              {(
                [
                  ["PLANNED", "Previsto"],
                  ["SETTLED", "Baixado"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  className={cn(
                    "cursor-pointer rounded-lg py-1.5 text-sm font-medium transition-colors",
                    status === id ? "bg-background shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {status === "SETTLED" && !isEdit && (
              <div className="pt-1.5">
                <Label className="text-xs text-muted-foreground">Data da baixa</Label>
                <DatePicker value={settlementDate} onChange={setSettlementDate} />
              </div>
            )}
          </div>
        )}

        {/* Escopo */}
        <div className="space-y-1.5">
          <Label>Para quem</Label>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
            {(
              [
                ["ENTITY", "Entidade"],
                ["MEMBERS", "Membros"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setScope(id);
                  if (id === "ENTITY") setShares([]);
                }}
                className={cn(
                  "cursor-pointer rounded-lg py-1.5 text-sm font-medium transition-colors",
                  scope === id ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {scope === "MEMBERS" && (
            <SplitBuilder
              members={membersQ.data ?? []}
              total={amount}
              value={shares}
              onChange={setShares}
            />
          )}
        </div>

        {/* Repetir / Parcelar (criação apenas; mutuamente exclusivos) */}
        {!isEdit && (
          <div className="space-y-3 rounded-xl border border-border/70 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="toggle-repeat" className="cursor-pointer">
                Repetir
              </Label>
              <Switch
                id="toggle-repeat"
                checked={mode === "repeat"}
                onCheckedChange={(c) => setMode(c ? "repeat" : "single")}
              />
            </div>
            {mode === "repeat" && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={interval}
                    onValueChange={(v) => setInterval(v as RecurrenceInterval)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    {!forever && (
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        className="w-20"
                        value={occurrences}
                        onChange={(e) => setOccurrences(Number(e.target.value))}
                        aria-label="Número de vezes"
                      />
                    )}
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch checked={forever} onCheckedChange={setForever} />
                      sem fim
                    </label>
                  </div>
                </div>
                {recurrencePreview && (
                  <p className="text-xs text-muted-foreground">
                    Próximas: {recurrencePreview.map((d) => formatDate(d)).join(" · ")}
                    {forever ? " · …" : ` · até completar ${occurrences}x`}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/60 pt-3">
              <Label htmlFor="toggle-installments" className="cursor-pointer">
                Parcelar
              </Label>
              <Switch
                id="toggle-installments"
                checked={mode === "installments"}
                onCheckedChange={(c) => setMode(c ? "installments" : "single")}
              />
            </div>
            {mode === "installments" && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={2}
                    max={60}
                    className="w-20"
                    value={installmentTotal}
                    onChange={(e) => setInstallmentTotal(Number(e.target.value))}
                    aria-label="Número de parcelas"
                  />
                  <span className="text-sm text-muted-foreground">parcelas</span>
                </div>
                {installmentPreview && BigInt(amount || "0") > 0n && (
                  <p className="text-xs text-muted-foreground">
                    {installmentTotal}x de {formatMoney(installmentPreview.per)}
                    {installmentPreview.last !== installmentPreview.per && (
                      <> · última de {formatMoney(installmentPreview.last)}</>
                    )}{" "}
                    — soma exata de {formatMoney(amount)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-1.5">
          <Label htmlFor="tx-description">Descrição</Label>
          <Input
            id="tx-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Mercado, aluguel, salário…"
          />
        </div>

        {/* Pago a (opcional) — pagamento a terceiro, sem criar conta/transferência */}
        {type === "EXPENSE" && (
          <div className="space-y-1.5">
            <Label htmlFor="tx-payee">Pago a (opcional)</Label>
            <Input
              id="tx-payee"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="Ex.: Fulano"
            />
            {fieldErrors.payeeName && (
              <p className="text-xs text-expense">{fieldErrors.payeeName}</p>
            )}
          </div>
        )}

        {/* Anexos — comprovante/boleto/nota fiscal. Só disponível em edição
            (lançamento precisa existir para vincular o anexo). */}
        {isEdit && transaction && (
          <div className="space-y-1.5">
            <Label>Anexos</Label>
            <AttachmentUploader target={{ kind: "transaction", id: transaction.id }} />
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

        <Button type="submit" className="w-full" disabled={pending || !!validationError}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Salvar alterações" : "Salvar"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
