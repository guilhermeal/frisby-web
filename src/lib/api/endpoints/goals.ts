// Sonhos & Metas (Sprint 6.1) — /entities/:id/goals. Cada meta tem uma conta
// de investimento dedicada por trás (transparente ao usuário); aportar é uma
// transferência comum (kind CONTRIBUTION) para essa conta. O backend calcula
// aporte mensal necessário, projeção de conclusão e viabilidade — o front
// nunca recalcula essas regras, só replica a fórmula simples no preview ao
// vivo do formulário para feedback instantâneo (confirmado pelo backend ao
// salvar).

import { api } from "../client";
import type { Goal, GoalCategory, GoalPreview, GoalStatus, GoalsViability } from "../types";

interface ApiGoal {
  id: string;
  name: string;
  category: GoalCategory;
  accountId: string;
  targetAmount: string;
  currency: string;
  targetDate: string;
  status: GoalStatus;
  currentAmount: string;
  progressPct: number;
  requiredMonthlyContribution: string;
  projectedCompletionDate: string | null;
  viability: Goal["viability"];
  createdAt: string;
}

function mapGoal(g: ApiGoal): Goal {
  return {
    id: g.id,
    name: g.name,
    category: g.category,
    accountId: g.accountId,
    targetAmount: g.targetAmount,
    currency: g.currency,
    targetDate: g.targetDate,
    status: g.status,
    currentAmount: g.currentAmount,
    progressPct: g.progressPct,
    requiredMonthlyContribution: g.requiredMonthlyContribution,
    projectedCompletionDate: g.projectedCompletionDate,
    viability: g.viability,
    createdAt: g.createdAt,
  };
}

export interface CreateGoalBody {
  name: string;
  category: GoalCategory;
  targetAmount: string;
  currency: string;
  targetDate: string; // YYYY-MM-DD
}

export interface UpdateGoalBody {
  name?: string;
  category?: GoalCategory;
  targetAmount?: string;
  targetDate?: string;
}

export const goalsApi = {
  list: async (entityId: string): Promise<Goal[]> => {
    const rows = await api.get<ApiGoal[]>(`/entities/${entityId}/goals`);
    return rows.map(mapGoal);
  },
  get: async (entityId: string, goalId: string): Promise<Goal> => {
    const g = await api.get<ApiGoal>(`/entities/${entityId}/goals/${goalId}`);
    return mapGoal(g);
  },
  create: async (entityId: string, body: CreateGoalBody): Promise<Goal> => {
    const created = await api.post<ApiGoal>(`/entities/${entityId}/goals`, body);
    return mapGoal(created);
  },
  update: async (entityId: string, goalId: string, body: UpdateGoalBody): Promise<Goal> => {
    const updated = await api.patch<ApiGoal>(`/entities/${entityId}/goals/${goalId}`, body);
    return mapGoal(updated);
  },
  /** Muda status: pausar/retomar/abandonar/marcar como alcançada. */
  setStatus: async (entityId: string, goalId: string, status: GoalStatus): Promise<Goal> => {
    const updated = await api.patch<ApiGoal>(`/entities/${entityId}/goals/${goalId}`, { status });
    return mapGoal(updated);
  },
  remove: (entityId: string, goalId: string) =>
    api.delete<void>(`/entities/${entityId}/goals/${goalId}`),
  /** Prévia ao vivo do aporte necessário — não persiste nada. */
  preview: (entityId: string, body: { targetAmount: string; targetDate: string }) =>
    api.post<GoalPreview>(`/entities/${entityId}/goals/preview`, body),
};

export const goalsViabilityApi = {
  /** Soma do aporte necessário de todas as metas ATIVAS vs. sobra mensal real. */
  get: (entityId: string) => api.get<GoalsViability>(`/entities/${entityId}/goals/viability`),
};
