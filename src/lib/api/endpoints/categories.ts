// Categorias (/entities/:id/categories) — árvore de 1 nível. Regras do
// backend: subcategoria herda o type do pai; nome único sob o mesmo pai;
// isSystem só permite renomear; delete é soft (histórico preservado).
// `code` é um atalho opcional (ex. "1.1.3"), único por entidade+tipo.

import { api } from "../client";
import type { Category, CategoryImportSummary, TxType } from "../types";
import { flattenCategories, type ApiCategory } from "./mappers";

export const categoriesApi = {
  list: async (entityId: string): Promise<Category[]> => {
    const tree = await api.get<ApiCategory[]>(`/entities/${entityId}/categories`);
    return flattenCategories(tree);
  },
  create: async (
    entityId: string,
    body: {
      name: string;
      type: TxType;
      parentId?: string;
      code?: string;
      color?: string;
      icon?: string;
    },
  ): Promise<Category> => {
    const created = await api.post<ApiCategory>(`/entities/${entityId}/categories`, body);
    return flattenCategories([created])[0];
  },
  update: async (
    entityId: string,
    categoryId: string,
    body: {
      name?: string;
      color?: string;
      icon?: string;
      code?: string;
      parentId?: string | null;
    },
  ): Promise<Category> => {
    const updated = await api.patch<ApiCategory>(
      `/entities/${entityId}/categories/${categoryId}`,
      body,
    );
    return flattenCategories([updated])[0];
  },
  remove: (entityId: string, categoryId: string) =>
    api.delete<void>(`/entities/${entityId}/categories/${categoryId}`),
  /** Importação em massa por código — idempotente (upsert por entityId+type+code). */
  importByJson: (
    entityId: string,
    items: Array<{ code: string; type: TxType; name: string }>,
  ): Promise<CategoryImportSummary> =>
    api.post<CategoryImportSummary>(`/entities/${entityId}/categories/import`, { items }),
  /** Mesmo endpoint — corpo CSV cru com colunas code,type,name. */
  importByCsv: (entityId: string, csv: string): Promise<CategoryImportSummary> =>
    api.post<CategoryImportSummary>(`/entities/${entityId}/categories/import`, { csv }),
};
