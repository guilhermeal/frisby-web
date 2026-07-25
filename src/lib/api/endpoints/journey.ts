// Jornada Financeira (Sprint 5.0): grupos master (/entities/:id/master-groups),
// fluxos/fases (/entities/:id/flows), status/snapshot/histórico/sugestão
// (/entities/:id/journey).

import { api } from "../client";
import type {
  Flow,
  FlowStage,
  JourneySnapshot,
  JourneyStatus,
  MasterGroup,
  UnlinkedCategory,
} from "../types";
import {
  mapFlow,
  mapFlowStage,
  mapJourneySnapshot,
  mapJourneyStatus,
  mapMasterGroup,
  type ApiFlow,
  type ApiFlowStage,
  type ApiJourneySnapshot,
  type ApiJourneyStatus,
  type ApiMasterGroup,
} from "./mappers";

export const masterGroupsApi = {
  list: async (entityId: string): Promise<MasterGroup[]> => {
    const groups = await api.get<ApiMasterGroup[]>(`/entities/${entityId}/master-groups`);
    return groups.map(mapMasterGroup);
  },
  unlinkedCategories: async (entityId: string): Promise<UnlinkedCategory[]> => {
    const res = await api.get<{ categories: UnlinkedCategory[] }>(
      `/entities/${entityId}/master-groups/unlinked-categories`,
    );
    return res.categories;
  },
  create: async (
    entityId: string,
    body: { name: string; color?: string; icon?: string; includeContributions?: boolean },
  ): Promise<MasterGroup> => {
    const created = await api.post<ApiMasterGroup>(`/entities/${entityId}/master-groups`, body);
    return mapMasterGroup(created);
  },
  update: async (
    entityId: string,
    groupId: string,
    body: Partial<{
      name: string;
      color: string | null;
      icon: string | null;
      includeContributions: boolean;
      order: number;
    }>,
  ): Promise<MasterGroup> => {
    const updated = await api.patch<ApiMasterGroup>(
      `/entities/${entityId}/master-groups/${groupId}`,
      body,
    );
    return mapMasterGroup(updated);
  },
  remove: (entityId: string, groupId: string) =>
    api.delete<void>(`/entities/${entityId}/master-groups/${groupId}`),
  setCategories: async (
    entityId: string,
    groupId: string,
    categoryIds: string[],
  ): Promise<MasterGroup> => {
    const updated = await api.put<ApiMasterGroup>(
      `/entities/${entityId}/master-groups/${groupId}/categories`,
      { categoryIds },
    );
    return mapMasterGroup(updated);
  },
};

export const flowsApi = {
  list: async (entityId: string): Promise<Flow[]> => {
    const flows = await api.get<ApiFlow[]>(`/entities/${entityId}/flows`);
    return flows.map(mapFlow);
  },
  create: async (entityId: string, body: { name: string; active?: boolean }): Promise<Flow> => {
    const created = await api.post<ApiFlow>(`/entities/${entityId}/flows`, body);
    return mapFlow(created);
  },
  createExample: async (entityId: string, activate?: boolean): Promise<Flow> => {
    const created = await api.post<ApiFlow>(`/entities/${entityId}/flows/example`, { activate });
    return mapFlow(created);
  },
  update: async (
    entityId: string,
    flowId: string,
    body: Partial<{ name: string; active: boolean }>,
  ): Promise<Flow> => {
    const updated = await api.patch<ApiFlow>(`/entities/${entityId}/flows/${flowId}`, body);
    return mapFlow(updated);
  },
  activate: async (entityId: string, flowId: string): Promise<Flow> => {
    const updated = await api.post<ApiFlow>(`/entities/${entityId}/flows/${flowId}/activate`);
    return mapFlow(updated);
  },
  remove: (entityId: string, flowId: string) =>
    api.delete<void>(`/entities/${entityId}/flows/${flowId}`),
  createStage: async (
    entityId: string,
    flowId: string,
    body: { name: string; description?: string; color?: string },
  ): Promise<FlowStage> => {
    const created = await api.post<ApiFlowStage>(
      `/entities/${entityId}/flows/${flowId}/stages`,
      body,
    );
    return mapFlowStage(created);
  },
  updateStage: async (
    entityId: string,
    flowId: string,
    stageId: string,
    body: Partial<{ name: string; description: string | null; color: string | null }>,
  ): Promise<FlowStage> => {
    const updated = await api.patch<ApiFlowStage>(
      `/entities/${entityId}/flows/${flowId}/stages/${stageId}`,
      body,
    );
    return mapFlowStage(updated);
  },
  removeStage: (entityId: string, flowId: string, stageId: string) =>
    api.delete<void>(`/entities/${entityId}/flows/${flowId}/stages/${stageId}`),
  moveStage: async (
    entityId: string,
    flowId: string,
    stageId: string,
    direction: "up" | "down",
  ): Promise<FlowStage[]> => {
    const stages = await api.post<ApiFlowStage[]>(
      `/entities/${entityId}/flows/${flowId}/stages/${stageId}/move`,
      { direction },
    );
    return stages.map(mapFlowStage);
  },
  setStageTargets: async (
    entityId: string,
    flowId: string,
    stageId: string,
    targets: { masterGroupId: string; minPct: number; maxPct: number }[],
  ): Promise<{ stage: FlowStage; warnings: string[] }> => {
    const res = await api.put<{ stage: ApiFlowStage; warnings: string[] }>(
      `/entities/${entityId}/flows/${flowId}/stages/${stageId}/targets`,
      { targets },
    );
    return { stage: mapFlowStage(res.stage), warnings: res.warnings };
  },
};

export const journeyApi = {
  status: async (entityId: string): Promise<JourneyStatus> => {
    const status = await api.get<ApiJourneyStatus>(`/entities/${entityId}/journey/status`);
    return mapJourneyStatus(status);
  },
  snapshot: async (entityId: string, month?: string): Promise<JourneySnapshot> => {
    const snapshot = await api.get<ApiJourneySnapshot>(`/entities/${entityId}/journey/snapshot`, {
      month,
    });
    return mapJourneySnapshot(snapshot);
  },
  history: async (
    entityId: string,
    months?: number,
  ): Promise<{ currency: string; snapshots: JourneySnapshot[] }> => {
    const res = await api.get<{ currency: string; snapshots: ApiJourneySnapshot[] }>(
      `/entities/${entityId}/journey/history`,
      { months },
    );
    return { currency: res.currency, snapshots: res.snapshots.map(mapJourneySnapshot) };
  },
  evaluate: async (entityId: string, month?: string): Promise<JourneySnapshot> => {
    const snapshot = await api.post<ApiJourneySnapshot>(`/entities/${entityId}/journey/evaluate`, {
      month,
    });
    return mapJourneySnapshot(snapshot);
  },
  acceptSuggestion: (entityId: string, month: string) =>
    api.post<{ currentStage: FlowStage | null }>(
      `/entities/${entityId}/journey/suggestion/accept`,
      { month },
    ),
  dismissSuggestion: (entityId: string, month: string) =>
    api.post<void>(`/entities/${entityId}/journey/suggestion/dismiss`, { month }),
  updateSettings: (
    entityId: string,
    body: Partial<{ evaluationDay: number; autoApply: boolean; currentStageId: string | null }>,
  ) =>
    api.patch<{ evaluationDay: number; autoApply: boolean; currentStage: FlowStage | null }>(
      `/entities/${entityId}/journey/settings`,
      body,
    ),
};
