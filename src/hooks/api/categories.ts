import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api/endpoints";
import type { TxType } from "@/lib/api/types";
import { qk } from "./keys";

export function useCategories(entityId: string | undefined) {
  return useQuery({
    queryKey: qk.categories(entityId ?? ""),
    queryFn: () => categoriesApi.list(entityId!),
    enabled: !!entityId,
  });
}

function useInvalidateCategories(entityId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    if (entityId) qc.invalidateQueries({ queryKey: qk.categories(entityId) });
  };
}

export function useCreateCategory(entityId: string | undefined) {
  const invalidate = useInvalidateCategories(entityId);
  return useMutation({
    mutationFn: (body: {
      name: string;
      type: TxType;
      parentId?: string;
      color?: string;
      icon?: string;
    }) => categoriesApi.create(entityId!, body),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory(entityId: string | undefined) {
  const invalidate = useInvalidateCategories(entityId);
  return useMutation({
    mutationFn: ({
      categoryId,
      ...body
    }: {
      categoryId: string;
      name?: string;
      color?: string;
      icon?: string;
    }) => categoriesApi.update(entityId!, categoryId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory(entityId: string | undefined) {
  const invalidate = useInvalidateCategories(entityId);
  return useMutation({
    mutationFn: (categoryId: string) => categoriesApi.remove(entityId!, categoryId),
    onSuccess: invalidate,
  });
}
