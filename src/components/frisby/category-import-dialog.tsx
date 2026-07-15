// Importação em massa de categorias por código — upload de CSV ou colar a
// lista (code,type,name). Mostra uma prévia local (parse client-side) antes
// de confirmar; o resumo real (criadas/atualizadas/ignoradas) vem do backend
// após a confirmação, que é idempotente (upsert por entidade+tipo+código).

import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import { useImportCategoriesCsv } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { CategoryImportSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface CategoryImportDialogProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewRow {
  code: string;
  type: string;
  name: string;
  valid: boolean;
  reason?: string;
}

/** Parse leve só para a prévia client-side — a validação de verdade é do backend. */
function previewCsv(text: string): PreviewRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = (lines[0] ?? "")
    .toLowerCase()
    .split(",")
    .map((h) => h.trim());
  const codeIdx = header.indexOf("code");
  const typeIdx = header.indexOf("type");
  const nameIdx = header.indexOf("name");
  const hasHeader = codeIdx !== -1 && typeIdx !== -1 && nameIdx !== -1;

  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const code = cells[hasHeader ? codeIdx : 0] ?? "";
    const type = (cells[hasHeader ? typeIdx : 1] ?? "").toUpperCase();
    const name = cells[hasHeader ? nameIdx : 2] ?? "";
    const valid = !!code && (type === "INCOME" || type === "EXPENSE") && !!name;
    return {
      code,
      type,
      name,
      valid,
      reason: valid
        ? undefined
        : !code
          ? "code ausente"
          : !name
            ? "name ausente"
            : "type deve ser INCOME ou EXPENSE",
    };
  });
}

export function CategoryImportDialog({ entityId, open, onOpenChange }: CategoryImportDialogProps) {
  const [csv, setCsv] = useState("");
  const [summary, setSummary] = useState<CategoryImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportCategoriesCsv(entityId);

  const preview = csv.trim() ? previewCsv(csv) : [];
  const validCount = preview.filter((r) => r.valid).length;
  const invalidCount = preview.length - validCount;

  function reset() {
    setCsv("");
    setSummary(null);
    setError(null);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result ?? ""));
      setSummary(null);
      setError(null);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleConfirm() {
    if (!csv.trim()) return;
    setError(null);
    try {
      const result = await importMutation.mutateAsync(csv);
      setSummary(result);
      toast.success(
        `Importação concluída: ${result.created} criadas, ${result.updated} atualizadas`,
      );
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
      title="Importar categorias"
      description="Upload de CSV ou cole a lista — colunas code,type,name. Rodar de novo não duplica."
    >
      <div className="space-y-4 pb-1">
        {!summary ? (
          <>
            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
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
                <Upload className="h-4 w-4" /> Escolher arquivo CSV
              </Button>
            </div>

            <div className="space-y-1.5">
              <Textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={"code,type,name\n1,EXPENSE,Casa\n1.1,EXPENSE,Energia"}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            {preview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-income">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {validCount} válidas
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-expense">
                      <XCircle className="h-3.5 w-3.5" /> {invalidCount} com erro
                    </span>
                  )}
                </div>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-border/60">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/60">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Código</th>
                        <th className="px-2 py-1.5 text-left font-medium">Tipo</th>
                        <th className="px-2 py-1.5 text-left font-medium">Nome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => (
                        <tr
                          key={idx}
                          className={cn("border-t border-border/40", !row.valid && "bg-expense/5")}
                          title={row.reason}
                        >
                          <td className="px-2 py-1 font-mono">{row.code || "—"}</td>
                          <td className="px-2 py-1">{row.type || "—"}</td>
                          <td className="px-2 py-1">
                            {row.name || <span className="text-expense">{row.reason}</span>}
                          </td>
                        </tr>
                      ))}
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
              disabled={!csv.trim() || importMutation.isPending}
              onClick={handleConfirm}
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar importação{preview.length > 0 ? ` (${preview.length} linhas)` : ""}
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-income/10 p-3">
                <p className="text-lg font-semibold text-income">{summary.created}</p>
                <p className="text-xs text-muted-foreground">Criadas</p>
              </div>
              <div className="rounded-xl bg-brand-soft/60 p-3">
                <p className="text-lg font-semibold text-brand">{summary.updated}</p>
                <p className="text-xs text-muted-foreground">Atualizadas</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-lg font-semibold">{summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Ignoradas</p>
              </div>
            </div>

            {summary.skipped > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-expense/30 bg-expense/5 p-3">
                <p className="mb-1.5 text-xs font-medium text-expense">Linhas ignoradas:</p>
                <ul className="space-y-1 text-xs text-expense">
                  {summary.rows
                    .filter((r) => r.action === "skipped")
                    .map((r, idx) => (
                      <li key={idx}>
                        <span className="font-mono">{r.code}</span> ({r.type}) — {r.reason}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                Importar outro arquivo
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
