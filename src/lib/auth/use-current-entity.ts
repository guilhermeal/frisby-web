import { useEffect, useState } from "react";
import { useEntities } from "@/hooks/api";
import { readCurrentEntityId, writeCurrentEntityId } from "./context";
import type { Entity } from "@/lib/api/types";

/**
 * Retorna a entidade "corrente" — persistida em localStorage. Se nada estiver
 * salvo, usa a primeira retornada pela API. Enquanto carrega ou não há
 * entidades, retorna `undefined`.
 */
export function useCurrentEntity(): {
  entity: Entity | undefined;
  entities: Entity[];
  setCurrent: (id: string) => void;
  isLoading: boolean;
} {
  const entitiesQ = useEntities();
  const [selectedId, setSelectedId] = useState<string | null>(() => readCurrentEntityId());

  useEffect(() => {
    if (selectedId) return;
    const first = entitiesQ.data?.[0]?.id;
    if (first) {
      writeCurrentEntityId(first);
      setSelectedId(first);
    }
  }, [entitiesQ.data, selectedId]);

  const entity = entitiesQ.data?.find((e) => e.id === selectedId) ?? entitiesQ.data?.[0];

  return {
    entity,
    entities: entitiesQ.data ?? [],
    isLoading: entitiesQ.isLoading,
    setCurrent: (id: string) => {
      writeCurrentEntityId(id);
      setSelectedId(id);
    },
  };
}
