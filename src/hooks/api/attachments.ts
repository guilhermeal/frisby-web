import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachmentsApi } from "@/lib/api/endpoints";
import type { Attachment } from "@/lib/api/types";
import { qk } from "./keys";

/** Metadados de um anexo já enviado ao storage mas ainda sem vínculo — usado
 * quando o lançamento/pagamento ainda não existe (ver useStagedUpload). */
export interface StagedAttachment {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export function useTransactionAttachments(transactionId: string | undefined) {
  return useQuery({
    queryKey: qk.transactionAttachments(transactionId ?? ""),
    queryFn: () => attachmentsApi.listForTransaction(transactionId!),
    enabled: !!transactionId,
  });
}

export function useInvoicePaymentAttachments(invoicePaymentId: string | undefined) {
  return useQuery({
    queryKey: qk.invoicePaymentAttachments(invoicePaymentId ?? ""),
    queryFn: () => attachmentsApi.listForInvoicePayment(invoicePaymentId!),
    enabled: !!invoicePaymentId,
  });
}

/** Fluxo completo: pede URL assinada → sobe o arquivo → confirma o vínculo. */
export function useUploadTransactionAttachment(transactionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }) => {
      const presigned = await attachmentsApi.getUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      await attachmentsApi.uploadFile(presigned, file, onProgress);
      return attachmentsApi.confirmForTransaction(transactionId!, {
        storageKey: presigned.storageKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    },
    onSuccess: () => {
      if (transactionId) {
        qc.invalidateQueries({ queryKey: qk.transactionAttachments(transactionId) });
      }
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/**
 * Sobe o arquivo pro storage SEM vincular a nada — usado quando o usuário
 * anexa um arquivo ainda criando o lançamento (id não existe ainda). O
 * vínculo real acontece depois, via useConfirmStagedTransactionAttachment,
 * assim que a transação é criada.
 */
export function useStagedUpload() {
  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }): Promise<StagedAttachment> => {
      const presigned = await attachmentsApi.getUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      await attachmentsApi.uploadFile(presigned, file, onProgress);
      return {
        storageKey: presigned.storageKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      };
    },
  });
}

/** Confirma o vínculo de um anexo já enviado (ver useStagedUpload) a uma
 * transação recém-criada. */
export function useConfirmStagedTransactionAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      staged,
    }: {
      transactionId: string;
      staged: StagedAttachment;
    }): Promise<Attachment> => attachmentsApi.confirmForTransaction(transactionId, staged),
    onSuccess: (_data, { transactionId }) => {
      qc.invalidateQueries({ queryKey: qk.transactionAttachments(transactionId) });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUploadInvoicePaymentAttachment(invoicePaymentId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }) => {
      const presigned = await attachmentsApi.getUploadUrl({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      await attachmentsApi.uploadFile(presigned, file, onProgress);
      return attachmentsApi.confirmForInvoicePayment(invoicePaymentId!, {
        storageKey: presigned.storageKey,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    },
    onSuccess: () => {
      if (invoicePaymentId) {
        qc.invalidateQueries({ queryKey: qk.invoicePaymentAttachments(invoicePaymentId) });
      }
    },
  });
}

export function useDeleteAttachment(
  scope:
    | { kind: "transaction"; id: string | undefined }
    | { kind: "invoicePayment"; id: string | undefined },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => attachmentsApi.remove(attachmentId),
    onSuccess: () => {
      if (scope.kind === "transaction" && scope.id) {
        qc.invalidateQueries({ queryKey: qk.transactionAttachments(scope.id) });
        qc.invalidateQueries({ queryKey: ["transactions"] });
      } else if (scope.kind === "invoicePayment" && scope.id) {
        qc.invalidateQueries({ queryKey: qk.invoicePaymentAttachments(scope.id) });
      }
    },
  });
}
