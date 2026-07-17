// Área de anexos (arrastar ou selecionar) reutilizada no formulário de
// lançamento, no diálogo de baixa e no pagamento de fatura. Preview por tipo
// (imagem/PDF/planilha), lista com nome+tamanho, upload com progresso, remover.
// O binário nunca passa pelo servidor da API — sobe direto pro storage via
// URL pré-assinada (ver hooks/api/attachments.ts).

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/frisby/confirm-dialog";
import {
  useDeleteAttachment,
  useInvoicePaymentAttachments,
  useTransactionAttachments,
  useUploadInvoicePaymentAttachment,
  useUploadTransactionAttachment,
} from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { Attachment } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ".jpg,.jpeg,.png,.webp,.heic,.pdf,.xls,.xlsx,.csv";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    return FileSpreadsheet;
  }
  return FileIcon;
}

interface AttachmentUploaderProps {
  /** Alvo do vínculo — lançamento ou pagamento de fatura (mutuamente exclusivo no backend). */
  target:
    | { kind: "transaction"; id: string | undefined }
    | { kind: "invoicePayment"; id: string | undefined };
  /** Quando o alvo ainda não existe (ex.: lançamento sendo criado), oculta a área. */
  disabled?: boolean;
  compact?: boolean;
}

export function AttachmentUploader({ target, disabled, compact }: AttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const isTransaction = target.kind === "transaction";
  const txAttachmentsQ = useTransactionAttachments(isTransaction ? target.id : undefined);
  const paymentAttachmentsQ = useInvoicePaymentAttachments(!isTransaction ? target.id : undefined);
  const attachmentsQ = isTransaction ? txAttachmentsQ : paymentAttachmentsQ;

  const uploadTx = useUploadTransactionAttachment(isTransaction ? target.id : undefined);
  const uploadPayment = useUploadInvoicePaymentAttachment(!isTransaction ? target.id : undefined);
  const uploadMutation = isTransaction ? uploadTx : uploadPayment;

  const deleteMutation = useDeleteAttachment(target);

  const attachments = attachmentsQ.data ?? [];
  const uploading = uploadMutation.isPending;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !target.id) return;
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`Arquivo excede o limite de ${MAX_SIZE_BYTES / 1024 / 1024}MB`);
      return;
    }

    setProgress(0);
    try {
      await uploadMutation.mutateAsync({ file, onProgress: setProgress });
      toast.success("Anexo enviado");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(attachment: Attachment) {
    try {
      await deleteMutation.mutateAsync(attachment.id);
      toast.success("Anexo removido");
    } catch (err) {
      toast.error(apiErrorMessage(err));
      throw err;
    }
  }

  if (disabled || !target.id) {
    return (
      <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-xs text-muted-foreground">
        Salve o lançamento para poder anexar arquivos.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {!compact && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
            dragOver ? "border-brand bg-brand-soft/40" : "border-border/70 hover:bg-secondary/40",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Arraste um arquivo ou{" "}
            <span className="font-medium text-brand">clique para selecionar</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Imagem, PDF ou planilha — até {MAX_SIZE_BYTES / 1024 / 1024}MB
          </p>
        </div>
      )}

      {compact && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          Anexar comprovante
        </Button>
      )}

      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">Enviando… {progress}%</p>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => {
            const Icon = iconFor(a.mimeType);
            return (
              <li
                key={a.id}
                className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2"
              >
                {a.mimeType.startsWith("image/") && a.downloadUrl ? (
                  <img
                    src={a.downloadUrl}
                    alt={a.fileName}
                    className="h-9 w-9 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {a.downloadUrl ? (
                    <a
                      href={a.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs font-medium hover:underline"
                      title={a.fileName}
                    >
                      {a.fileName}
                    </a>
                  ) : (
                    <p className="truncate text-xs font-medium" title={a.fileName}>
                      {a.fileName}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{formatBytes(a.sizeBytes)}</p>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={`Remover ${a.fileName}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  }
                  title="Remover anexo?"
                  description={`"${a.fileName}" será removido deste registro.`}
                  confirmLabel="Remover"
                  destructive
                  onConfirm={() => handleDelete(a)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
