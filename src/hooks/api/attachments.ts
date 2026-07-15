import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachmentsApi } from "@/lib/api/endpoints";
import { qk } from "./keys";

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
