// Entidades (/entities). Criar uma entidade também semeia papéis, membership
// do criador (OWNER) e categorias padrão — tudo no backend.

import { api } from "../client";
import type { Entity, EntityType } from "../types";
import type { ApiEntity } from "./mappers";

export interface CompanyProfileBody {
  taxId: string; // CNPJ formatado: XX.XXX.XXX/XXXX-XX
  legalName: string;
  tradeName?: string;
}

export interface CreateEntityBody {
  name: string;
  type: EntityType;
  companyProfile?: CompanyProfileBody;
}

function mapEntity(e: ApiEntity): Entity {
  return { id: e.id, name: e.name, type: e.type };
}

export const entitiesApi = {
  list: async (): Promise<Entity[]> => {
    const entities = await api.get<ApiEntity[]>("/entities");
    return entities.map(mapEntity);
  },
  create: async (body: CreateEntityBody): Promise<Entity> => {
    const created = await api.post<ApiEntity>("/entities", body);
    return mapEntity(created);
  },
  update: async (
    id: string,
    body: { name?: string; companyProfile?: Partial<CompanyProfileBody> },
  ): Promise<Entity> => {
    const updated = await api.patch<ApiEntity>(`/entities/${id}`, body);
    return mapEntity(updated);
  },
  remove: (id: string) => api.delete<void>(`/entities/${id}`),
};
