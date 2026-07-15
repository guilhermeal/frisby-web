import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entitiesApi, type CreateEntityBody } from "@/lib/api/endpoints";
import { qk } from "./keys";

export function useEntities() {
  return useQuery({ queryKey: qk.entities, queryFn: entitiesApi.list });
}

export function useCreateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEntityBody) => entitiesApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.entities });
    },
  });
}

export function useUpdateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => entitiesApi.update(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.entities });
    },
  });
}

export function useDeleteEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => entitiesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.entities });
    },
  });
}
