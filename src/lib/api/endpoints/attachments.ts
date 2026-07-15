// Anexos de documentos (comprovantes, boletos, notas fiscais) vinculados a um
// lançamento OU a um pagamento de fatura. Upload em 3 passos:
//   1. attachmentsApi.getUploadUrl — pede URL assinada (valida tipo/tamanho no backend)
//   2. attachmentsApi.uploadFile — PUT direto pro storage (binário nunca passa pela API)
//   3. attachmentsApi.confirmForTransaction/confirmForInvoicePayment — vincula o registro
//
// Download é sempre por URL assinada e temporária — nunca público direto.

import { api } from "../client";
import type { Attachment } from "../types";

interface ApiAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl?: string;
}

interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  requiredHeaders: Record<string, string>;
  expiresInSeconds: number;
}

function mapAttachment(a: ApiAttachment): Attachment {
  return {
    id: a.id,
    fileName: a.fileName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    createdAt: a.createdAt,
    downloadUrl: a.downloadUrl,
  };
}

export const attachmentsApi = {
  getUploadUrl: (body: { fileName: string; mimeType: string; sizeBytes: number }) =>
    api.post<PresignedUpload>("/attachments/upload-url", body),

  /** PUT direto pro storage — nunca passa pelo client `api` (sem Bearer/BASE_URL). */
  uploadFile: async (
    presigned: PresignedUpload,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presigned.uploadUrl);
      for (const [key, value] of Object.entries(presigned.requiredHeaders)) {
        xhr.setRequestHeader(key, value);
      }
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload falhou (HTTP ${xhr.status})`));
      };
      xhr.onerror = () => reject(new Error("Falha de rede durante o upload"));
      xhr.send(file);
    });
  },

  confirmForTransaction: async (
    transactionId: string,
    body: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number },
  ): Promise<Attachment> => {
    const created = await api.post<ApiAttachment>(
      `/transactions/${transactionId}/attachments`,
      body,
    );
    return mapAttachment(created);
  },

  listForTransaction: async (transactionId: string): Promise<Attachment[]> => {
    const rows = await api.get<ApiAttachment[]>(`/transactions/${transactionId}/attachments`);
    return rows.map(mapAttachment);
  },

  confirmForInvoicePayment: async (
    invoicePaymentId: string,
    body: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number },
  ): Promise<Attachment> => {
    const created = await api.post<ApiAttachment>(
      `/invoice-payments/${invoicePaymentId}/attachments`,
      body,
    );
    return mapAttachment(created);
  },

  listForInvoicePayment: async (invoicePaymentId: string): Promise<Attachment[]> => {
    const rows = await api.get<ApiAttachment[]>(
      `/invoice-payments/${invoicePaymentId}/attachments`,
    );
    return rows.map(mapAttachment);
  },

  remove: (attachmentId: string) => api.delete<void>(`/attachments/${attachmentId}`),
};
