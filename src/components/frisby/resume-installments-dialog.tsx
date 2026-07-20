// Continua um parcelamento que já estava em andamento antes de entrar no
// Frisby (ex.: compra em 10x, 4 parcelas já pagas fora do sistema) — gera só
// as parcelas restantes, com um installmentGroupId novo. As parcelas
// anteriores a "a partir de qual parcela" não existem no histórico do app.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { MoneyInput } from "@/components/frisby/money-input";
import { DatePicker } from "@/components/frisby/date-picker";
import { AccountSelect } from "@/components/frisby/account-select";
import { CategorySelect } from "@/components/frisby/category-select";
import { useResumeInstallments } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { todayISO } from "@/lib/format";
import type { AccountType } from "@/lib/api/types";

const NON_CARD_TYPES: AccountType[] = ["WALLET", "BANK", "INVESTMENT"];

/** Próximas N datas mensais a partir de uma data base — só para prévia local. */
function previewDates(startDate: string, n: number): string[] {
  const [y, m, d] = startDate.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const lastDay = new Date(Date.UTC(y, m + i, 0)).getUTCDate();
    const date = new Date(Date.UTC(y, m - 1 + i, Math.min(d, lastDay)));
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

interface ResumeInstallmentsDialogProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResumeInstallmentsDialog({
  entityId,
  open,
  onOpenChange,
}: ResumeInstallmentsDialogProps) {
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [installmentTotal, setInstallmentTotal] = useState("");
  const [resumeFromNumber, setResumeFromNumber] = useState("");
  const [nextCompetenceDate, setNextCompetenceDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  const resumeInstallments = useResumeInstallments(entityId);
  const pending = resumeInstallments.isPending;

  useEffect(() => {
    if (open) {
      setAccountId(undefined);
      setCategoryId(undefined);
      setDescription("");
      setInstallmentAmount("");
      setInstallmentTotal("");
      setResumeFromNumber("");
      setNextCompetenceDate(todayISO());
      setError(null);
    }
  }, [open]);

  const totalN = Number(installmentTotal);
  const fromN = Number(resumeFromNumber);
  const validRange =
    installmentTotal !== "" &&
    resumeFromNumber !== "" &&
    totalN >= 2 &&
    fromN >= 1 &&
    fromN <= totalN;

  const preview =
    validRange && installmentAmount ? previewDates(nextCompetenceDate, totalN - fromN + 1) : [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) return setError("Escolha a conta (cartão).");
    if (!categoryId) return setError("Escolha uma categoria.");
    if (!installmentAmount || installmentAmount === "0")
      return setError("Informe o valor da parcela.");
    if (!validRange)
      return setError('"A partir de qual parcela" deve ser entre 1 e o total de parcelas.');
    setError(null);

    try {
      await resumeInstallments.mutateAsync({
        accountId,
        categoryId,
        description: description || undefined,
        installmentAmount,
        installmentTotal: totalN,
        resumeFromNumber: fromN,
        nextCompetenceDate,
        scope: "ENTITY",
      });
      toast.success(`Parcelas ${fromN}/${totalN} até ${totalN}/${totalN} criadas`);
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title="Continuar parcelamento existente"
      description="Para compras já parceladas antes de usar o Frisby — gera só as parcelas restantes."
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label>Conta (cartão)</Label>
          <AccountSelect
            entityId={entityId}
            value={accountId}
            onChange={(id) => setAccountId(id)}
            excludeTypes={NON_CARD_TYPES}
            placeholder="Escolha o cartão"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <CategorySelect
            entityId={entityId}
            type="EXPENSE"
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resume-desc">Descrição</Label>
          <Input
            id="resume-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Máquina de lavar"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="resume-amount">Valor da parcela</Label>
            <MoneyInput
              id="resume-amount"
              value={installmentAmount}
              onChange={setInstallmentAmount}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resume-total">Total de parcelas</Label>
            <Input
              id="resume-total"
              type="number"
              min={2}
              max={60}
              value={installmentTotal}
              onChange={(e) => setInstallmentTotal(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="resume-from">A partir de qual parcela</Label>
            <Input
              id="resume-from"
              type="number"
              min={1}
              max={installmentTotal || undefined}
              value={resumeFromNumber}
              onChange={(e) => setResumeFromNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data da próxima parcela</Label>
            <DatePicker value={nextCompetenceDate} onChange={setNextCompetenceDate} />
          </div>
        </div>

        {validRange && (
          <div className="rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            Vamos criar as parcelas{" "}
            <strong>
              {fromN}/{totalN}
            </strong>{" "}
            até{" "}
            <strong>
              {totalN}/{totalN}
            </strong>
            {preview.length > 0 && (
              <>
                {" "}
                — de {preview[0]} até {preview[preview.length - 1]}.
              </>
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
          Continuar parcelamento
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
