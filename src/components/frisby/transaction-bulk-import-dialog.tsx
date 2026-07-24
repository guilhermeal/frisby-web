// Importação em massa de lançamentos históricos — colar texto (ou upload de
// arquivo) sem header, uma linha por lançamento:
// data;descricao;parcela;total;valor;categoria (categoria é opcional, 6ª coluna).
// Prévia local antes de confirmar; toda validação de negócio é do backend
// (resposta parcial: created/failed). Quando parcela/total vêm preenchidos e
// a parcela informada é menor que o total, o backend cria a parcela atual
// (histórico, na data da linha) e AUTOMATICAMENTE as parcelas restantes como
// previstas nos meses seguintes — nunca recria as parcelas já pagas antes
// dessa (1..parcela-1), pois não há certeza de que existiram no sistema.

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { AccountSelect } from "@/components/frisby/account-select";
import { CategorySelect } from "@/components/frisby/category-select";
import {
  useBulkImportTransactions,
  useBulkPreviewCategories,
  useCardInvoices,
  useCreateCurrentInvoice,
  useTransactions,
} from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type {
  Account,
  CategoryResolutionMethod,
  Transaction,
  TransactionBulkImportSummary,
  TxType,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface TransactionBulkImportDialogProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewRow {
  date: string;
  description: string;
  installmentNumber: number | null;
  installmentTotal: number | null;
  amount: string; // centavos, "" se inválido
  /** Texto bruto da 6ª coluna (opcional) — UUID, código ou nome de categoria. */
  categoryHint: string | null;
  valid: boolean;
  reason?: string;
}

/** "9900" / "99,00" / "99.00" / "-99,00" → centavos-string ("9900"/"-9900"). */
function parseAmountToCents(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const negative = trimmed.startsWith("-");
  const cleaned = trimmed
    .replace(/^-/, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "") // separador de milhar "1.234,56"
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isFinite(cents) || cents === 0) return null;
  return negative ? `-${cents}` : `${cents}`;
}

function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Parse leve só para a prévia client-side — a validação de verdade é do backend. */
function parseBulkText(text: string): PreviewRow[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(";").map((c) => c.trim());
      // Formato antigo (Sprint 4.6): 5 colunas, sem categoria. Formato novo
      // (Sprint 4.7): 6ª coluna opcional com UUID, código ou nome da categoria.
      if (cells.length !== 5 && cells.length !== 6) {
        return {
          date: cells[0] ?? "",
          description: cells[1] ?? "",
          installmentNumber: null,
          installmentTotal: null,
          amount: "",
          categoryHint: null,
          valid: false,
          reason: "linha precisa ter 5 ou 6 campos: data;descricao;parcela;total;valor;categoria",
        };
      }
      const [dateRaw, description, parcelaRaw, totalRaw, valorRaw, categoriaRaw] = cells as [
        string,
        string,
        string,
        string,
        string,
        string?,
      ];
      const categoryHint = categoriaRaw?.trim() ? categoriaRaw.trim() : null;

      if (!isValidISODate(dateRaw)) {
        return {
          date: dateRaw,
          description,
          installmentNumber: null,
          installmentTotal: null,
          amount: "",
          categoryHint,
          valid: false,
          reason: "data inválida (use AAAA-MM-DD)",
        };
      }
      if (!description) {
        return {
          date: dateRaw,
          description,
          installmentNumber: null,
          installmentTotal: null,
          amount: "",
          categoryHint,
          valid: false,
          reason: "descrição ausente",
        };
      }
      const cents = parseAmountToCents(valorRaw);
      if (cents === null) {
        return {
          date: dateRaw,
          description,
          installmentNumber: null,
          installmentTotal: null,
          amount: "",
          categoryHint,
          valid: false,
          reason: "valor inválido",
        };
      }
      const hasParcela = parcelaRaw !== "";
      const hasTotal = totalRaw !== "";
      if (hasParcela !== hasTotal) {
        return {
          date: dateRaw,
          description,
          installmentNumber: null,
          installmentTotal: null,
          amount: cents,
          categoryHint,
          valid: false,
          reason: "parcela e total devem vir juntos ou ambos vazios",
        };
      }
      const installmentNumber = hasParcela ? Number(parcelaRaw) : null;
      const installmentTotal = hasTotal ? Number(totalRaw) : null;
      if (
        hasParcela &&
        (!Number.isInteger(installmentNumber) || (installmentNumber as number) < 1)
      ) {
        return {
          date: dateRaw,
          description,
          installmentNumber: null,
          installmentTotal: null,
          amount: cents,
          categoryHint,
          valid: false,
          reason: "parcela inválida",
        };
      }
      return {
        date: dateRaw,
        description,
        installmentNumber,
        installmentTotal,
        amount: cents,
        categoryHint,
        valid: true,
      };
    });
}

interface DuplicateMatch {
  matchedFields: string[];
  similar: Transaction;
}

/**
 * Compara cada linha válida contra transações já existentes nos 5 campos
 * (data, descrição, parcela, total de parcelas, valor). >=3 de 5 campos
 * batendo exatamente marca a linha como possível duplicata — só um alerta
 * visual, nunca bloqueia a importação.
 */
function detectDuplicates(
  rows: PreviewRow[],
  existing: Transaction[],
): Map<number, DuplicateMatch> {
  const result = new Map<number, DuplicateMatch>();
  rows.forEach((row, idx) => {
    if (!row.valid) return;
    let best: DuplicateMatch | null = null;
    for (const tx of existing) {
      const fields = [
        tx.competenceDate === row.date,
        tx.description.trim().toLowerCase() === row.description.trim().toLowerCase(),
        (tx.installment?.number ?? null) === row.installmentNumber,
        (tx.installment?.total ?? null) === row.installmentTotal,
        tx.amount === row.amount,
      ];
      const matchedFields = (
        ["Data", "Descrição", "Parcela", "Total de parcelas", "Valor"] as const
      ).filter((_, i) => fields[i]);
      if (
        matchedFields.length >= 3 &&
        (!best || matchedFields.length > best.matchedFields.length)
      ) {
        best = { matchedFields, similar: tx };
      }
    }
    if (best) result.set(idx, best);
  });
  return result;
}

export function TransactionBulkImportDialog({
  entityId,
  open,
  onOpenChange,
}: TransactionBulkImportDialogProps) {
  const [text, setText] = useState("");
  const [type, setType] = useState<TxType>("EXPENSE");
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>(undefined);
  const [targetInvoiceId, setTargetInvoiceId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  /** Override de categoria por linha (índice → categoryId) — vence a categoria padrão do lote. */
  const [rowCategoryOverrides, setRowCategoryOverrides] = useState<Map<number, string>>(new Map());
  /** Resolução da coluna de categoria do CSV por linha (índice → resultado do backend). */
  const [categoryResolutions, setCategoryResolutions] = useState<
    Map<number, { categoryId: string | null; categoryName: string | null; resolvedBy: CategoryResolutionMethod }>
  >(new Map());
  const [summary, setSummary] = useState<TransactionBulkImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkImport = useBulkImportTransactions(entityId);
  const bulkPreviewCategories = useBulkPreviewCategories(entityId);
  const isCreditCard = selectedAccount?.type === "CREDIT_CARD";
  const invoicesQ = useCardInvoices(isCreditCard ? accountId : undefined);
  const openInvoices = (invoicesQ.data ?? []).filter((i) => i.status === "OPEN");
  const createCurrentInvoice = useCreateCurrentInvoice(isCreditCard ? accountId : undefined);

  // Comparação de duplicidade fica restrita à mesma conta escolhida, entre os
  // últimos lançamentos da entidade — reduz o universo e evita falso-positivo
  // entre contas diferentes.
  const existingTxQ = useTransactions({ entityId });
  const existingForAccount = useMemo(
    () => (existingTxQ.data ?? []).filter((t) => t.accountId === accountId),
    [existingTxQ.data, accountId],
  );

  const preview = useMemo(() => (text.trim() ? parseBulkText(text) : []), [text]);
  const validRows = preview.filter((r) => r.valid);
  const invalidCount = preview.length - validRows.length;
  const duplicates = useMemo(
    () => detectDuplicates(preview, existingForAccount),
    [preview, existingForAccount],
  );

  // Resolve a coluna de categoria do CSV (UUID, código ou nome) por linha
  // assim que houver linhas válidas com a dica preenchida — pré-seleciona a
  // categoria na tabela de conferência sem bloquear a digitação/upload.
  useEffect(() => {
    const rowsWithHint = validRows.filter((r) => r.categoryHint);
    if (rowsWithHint.length === 0) {
      setCategoryResolutions(new Map());
      return;
    }
    let cancelled = false;
    bulkPreviewCategories
      .mutateAsync({
        type,
        ...(defaultCategoryId ? { defaultCategoryId } : {}),
        rows: validRows.map((r) => ({ categoryHint: r.categoryHint })),
      })
      .then((result) => {
        if (cancelled) return;
        const next = new Map<
          number,
          { categoryId: string | null; categoryName: string | null; resolvedBy: CategoryResolutionMethod }
        >();
        validRows.forEach((row, i) => {
          const originalIdx = preview.indexOf(row);
          const resolved = result.rows[i];
          if (resolved) next.set(originalIdx, resolved);
        });
        setCategoryResolutions(next);
      })
      .catch(() => {
        if (!cancelled) setCategoryResolutions(new Map());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, type, defaultCategoryId, entityId]);

  function setTextAndReselect(next: string) {
    setText(next);
    const rows = next.trim() ? parseBulkText(next) : [];
    setSelected(new Set(rows.map((r, i) => (r.valid ? i : -1)).filter((i) => i >= 0)));
    setRowCategoryOverrides(new Map());
    setCategoryResolutions(new Map());
  }

  function reset() {
    setText("");
    setSelected(new Set());
    setRowCategoryOverrides(new Map());
    setCategoryResolutions(new Map());
    setAccountId(undefined);
    setSelectedAccount(undefined);
    setTargetInvoiceId(undefined);
    setSummary(null);
    setError(null);
  }

  function handleAccountChange(id: string, account: Account | undefined) {
    setAccountId(id);
    setSelectedAccount(account);
    setTargetInvoiceId(undefined);
  }

  function setRowCategory(idx: number, categoryId: string) {
    setRowCategoryOverrides((prev) => {
      const next = new Map(prev);
      next.set(idx, categoryId);
      return next;
    });
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setTextAndReselect(String(reader.result ?? ""));
      setSummary(null);
      setError(null);
    };
    reader.readAsText(file, "utf-8");
  }

  function toggleRow(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const selectedIndexes = preview
    .map((r, idx) => (selected.has(idx) && r.valid ? idx : -1))
    .filter((idx) => idx >= 0);

  async function handleConfirm() {
    if (!accountId) return setError("Escolha a conta de origem.");
    if (isCreditCard && !targetInvoiceId) return setError("Escolha a fatura de destino do cartão.");
    if (selectedIndexes.length === 0) return setError("Selecione ao menos uma linha válida.");
    setError(null);
    try {
      const result = await bulkImport.mutateAsync({
        type,
        accountId,
        defaultCategoryId,
        defaultScope: "ENTITY",
        ...(targetInvoiceId ? { targetInvoiceId } : {}),
        rows: selectedIndexes.map((idx) => {
          const r = preview[idx]!;
          return {
            date: r.date,
            description: r.description,
            amount: r.amount,
            installmentNumber: r.installmentNumber,
            installmentTotal: r.installmentTotal,
            categoryId:
              rowCategoryOverrides.get(idx) ?? categoryResolutions.get(idx)?.categoryId ?? null,
          };
        }),
      });
      setSummary(result);
      toast.success(
        `Importação concluída: ${result.created.length} criados, ${result.failed.length} com erro`,
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleCreateCurrentInvoice() {
    try {
      const inv = await createCurrentInvoice.mutateAsync();
      setTargetInvoiceId(inv.id);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
      title="Importar lançamentos"
      description="Cole o texto ou envie um arquivo — uma linha por lançamento, sem cabeçalho."
    >
      <div className="space-y-4 pb-1">
        {!summary ? (
          <>
            <Tabs value={type} onValueChange={(v) => setType(v as TxType)}>
              <TabsList>
                <TabsTrigger value="EXPENSE">Despesa</TabsTrigger>
                <TabsTrigger value="INCOME">Receita</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Conta de origem</Label>
                <AccountSelect
                  entityId={entityId}
                  value={accountId}
                  onChange={handleAccountChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria padrão (opcional)</Label>
                <CategorySelect
                  entityId={entityId}
                  type={type}
                  value={defaultCategoryId}
                  onChange={setDefaultCategoryId}
                  placeholder="Cai em 'Não identificados' se vazio"
                />
              </div>
            </div>

            {isCreditCard && (
              <div className="space-y-1.5">
                <Label>Fatura de destino</Label>
                <p className="text-xs text-muted-foreground">
                  Todos os lançamentos deste lote são vinculados a esta fatura; parcelas restantes
                  avançam para as faturas seguintes automaticamente.
                </p>
                {invoicesQ.isLoading ? (
                  <p className="text-xs text-muted-foreground">Carregando faturas…</p>
                ) : openInvoices.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createCurrentInvoice.isPending}
                    onClick={handleCreateCurrentInvoice}
                  >
                    {createCurrentInvoice.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar fatura do mês atual
                  </Button>
                ) : (
                  <Select value={targetInvoiceId} onValueChange={setTargetInvoiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha a fatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {openInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          Fatura {inv.month} — fecha {formatDate(inv.closingDate)} —{" "}
                          {formatMoney(inv.calculatedAmount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,text/plain,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> Escolher arquivo
              </Button>
            </div>

            <div className="space-y-1.5">
              <Textarea
                value={text}
                onChange={(e) => setTextAndReselect(e.target.value)}
                placeholder={
                  "2026-06-28;Ponto 4 Maceio;;;9900;2.5.3\n2025-12-23;Mercado Livre;7;10;57,91;"
                }
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <p>
                Não importe linhas de saldo anterior/pagamento de fatura — o Frisby já calcula isso
                automaticamente a partir das compras.
              </p>
              <p>
                Linha com parcela informada (ex.: <span className="font-mono">4;10</span>) cria a
                parcela atual nessa data e gera as parcelas restantes (5 a 10) automaticamente,
                previstas nos meses seguintes — as já pagas antes não são recriadas.
              </p>
              <p>
                A 6ª coluna (categoria) é <strong>opcional</strong>: aceita UUID, código (ex.:{" "}
                <span className="font-mono">2.5.3</span>) ou nome exato de uma categoria já
                cadastrada. Deixe vazia para usar a categoria padrão do lote. Arquivos com apenas
                5 colunas (formato antigo) continuam funcionando normalmente.
              </p>
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-income">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {validRows.length} válidas
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-expense">
                      <XCircle className="h-3.5 w-3.5" /> {invalidCount} com erro
                    </span>
                  )}
                  {duplicates.size > 0 && (
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="h-3.5 w-3.5" /> {duplicates.size} possível
                      {duplicates.size > 1 ? "eis" : ""} duplicata
                      {duplicates.size > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/60 text-left uppercase tracking-wider text-muted-foreground">
                      <tr className="border-b border-border/60">
                        <th className="w-8 px-2 py-1.5"></th>
                        <th className="w-6 px-1 py-1.5"></th>
                        <th className="p-1 font-medium">Data</th>
                        <th className="p-1 font-medium">Descrição</th>
                        <th className="p-1 font-medium">Parcela</th>
                        <th className="min-w-35 p-1 font-medium">Categoria</th>
                        <th className="min-w-25 p-1 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => {
                        const dup = duplicates.get(idx);
                        return (
                          <tr
                            key={idx}
                            className={cn(
                              "border-t border-border/40 hover:bg-secondary/40",
                              !row.valid && "bg-expense/5",
                              row.valid && dup && "bg-warning/10",
                            )}
                            title={row.reason}
                          >
                            <td className="px-2 py-1">
                              <Checkbox
                                checked={selected.has(idx)}
                                disabled={!row.valid}
                                onCheckedChange={() => toggleRow(idx)}
                                aria-label={`Selecionar linha ${idx + 1}`}
                              />
                            </td>
                            <td className="px-1 py-1">
                              {dup && (
                                <span
                                  title={`Possível duplicata — campos coincidentes: ${dup.matchedFields.join(", ")}. Lançamento parecido: "${dup.similar.description}" em ${formatDate(dup.similar.competenceDate)}, ${formatMoney(dup.similar.amount, "BRL", "pt-BR", { sign: true })}.`}
                                >
                                  <AlertTriangle
                                    className="h-3.5 w-3.5 text-warning"
                                    aria-label="Possível duplicata"
                                  />
                                </span>
                              )}
                            </td>
                            <td className="p-1">{row.date || "—"}</td>
                            <td className="p-1">
                              {row.description || (
                                <span className="text-expense text-ellipsis" title={row.reason}>
                                  {row.reason}
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              {row.installmentNumber && row.installmentTotal
                                ? `${row.installmentNumber}/${row.installmentTotal}`
                                : "—"}
                            </td>
                            <td className="p-1">
                              {row.valid && (
                                <div className="flex items-center gap-1">
                                  <CategorySelect
                                    entityId={entityId}
                                    type={type}
                                    value={
                                      rowCategoryOverrides.get(idx) ??
                                      categoryResolutions.get(idx)?.categoryId ??
                                      defaultCategoryId
                                    }
                                    onChange={(categoryId) => setRowCategory(idx, categoryId)}
                                    placeholder="Padrão do lote"
                                    className="h-7 text-xs"
                                  />
                                  {(() => {
                                    const resolution = categoryResolutions.get(idx);
                                    if (!resolution || rowCategoryOverrides.has(idx)) return null;
                                    if (
                                      resolution.resolvedBy === "uuid" ||
                                      resolution.resolvedBy === "code" ||
                                      resolution.resolvedBy === "name"
                                    ) {
                                      return (
                                        <span title={`Categoria resolvida pelo arquivo (${resolution.resolvedBy}): ${resolution.categoryName}`}>
                                          <FileCheck2
                                            className="h-3.5 w-3.5 shrink-0 text-income"
                                            aria-label="Categoria resolvida pelo arquivo"
                                          />
                                        </span>
                                      );
                                    }
                                    if (
                                      resolution.resolvedBy === "ambiguous" ||
                                      resolution.resolvedBy === "notfound"
                                    ) {
                                      return (
                                        <span
                                          title={
                                            resolution.resolvedBy === "ambiguous"
                                              ? "Categoria do arquivo é ambígua (mais de uma com o mesmo nome) — usando padrão"
                                              : "Categoria do arquivo não encontrada — usando padrão"
                                          }
                                        >
                                          <AlertTriangle
                                            className="h-3.5 w-3.5 shrink-0 text-warning"
                                            aria-label="Categoria do arquivo não resolvida"
                                          />
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="p-1 text-right">
                              {row.amount
                                ? formatMoney(row.amount, "BRL", "pt-BR", { sign: true })
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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

            <Button
              type="button"
              className="w-full"
              disabled={!accountId || selectedIndexes.length === 0 || bulkImport.isPending}
              onClick={handleConfirm}
            >
              {bulkImport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar importação ({selectedIndexes.length} linhas)
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-income/10 p-3">
                <p className="text-lg font-semibold text-income">{summary.created.length}</p>
                <p className="text-xs text-muted-foreground">Criados</p>
              </div>
              <div className="rounded-xl bg-expense/10 p-3">
                <p className="text-lg font-semibold text-expense">{summary.failed.length}</p>
                <p className="text-xs text-muted-foreground">Com erro</p>
              </div>
            </div>

            {summary.failed.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-expense/30 bg-expense/5 p-3">
                <p className="mb-1.5 text-xs font-medium text-expense">Linhas com erro:</p>
                <ul className="space-y-1 text-xs text-expense">
                  {summary.failed.map((f, idx) => (
                    <li key={idx}>
                      Linha {f.index + 1} — {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                Importar outro
              </Button>
              <Button type="button" className="flex-1" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
}
