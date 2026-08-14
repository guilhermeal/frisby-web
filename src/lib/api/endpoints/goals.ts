// Sonhos & Metas (Sprint 6.0) — /entities/:id/goals. Cada meta tem uma conta
// de investimento dedicada por trás (transparente ao usuário), criada
// atomicamente pelo backend na criação da meta; aportar é uma transferência
// comum (kind CONTRIBUTION, já implementada em transfersApi) para essa
// conta — não existe endpoint próprio de "aportar" nem de "preview": o
// aporte mensal necessário já vem calculado em cada Goal (requiredMonthly),
// e a prévia ao vivo do formulário replica a mesma fórmula simples no
// cliente (ver goal-form-dialog.tsx), sem chamada de rede.

import { api } from "../client";
import type { Goal, GoalHorizon, GoalsFeasibility, GoalStatus } from "../types";

interface ApiGoal {
  id: string;
  entityId: string;
  name: string;
  description: string | null;
  targetAmount: string;
  currency: string;
  targetDate: string; // ISO datetime
  accountId: string;
  horizon: GoalHorizon;
  status: GoalStatus;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  currentBalance: string;
  progressPct: number;
  monthsRemaining: number;
  requiredMonthly: string;
}

function mapGoal(g: ApiGoal): Goal {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    accountId: g.accountId,
    targetAmount: g.targetAmount,
    currency: g.currency,
    targetDate: g.targetDate.slice(0, 10),
    horizon: g.horizon,
    status: g.status,
    icon: g.icon,
    color: g.color,
    currentBalance: g.currentBalance,
    progressPct: g.progressPct,
    monthsRemaining: g.monthsRemaining,
    requiredMonthly: g.requiredMonthly,
    createdAt: g.createdAt,
  };
}

export interface CreateGoalBody {
  name: string;
  description?: string;
  targetAmount: string;
  currency: string;
  targetDate: string; // YYYY-MM-DD
  horizon?: GoalHorizon; // se omitido, o backend deriva de targetDate
  icon?: string;
  color?: string;
}

export interface UpdateGoalBody {
  name?: string;
  description?: string | null;
  targetAmount?: string;
  targetDate?: string;
  horizon?: GoalHorizon;
  status?: GoalStatus;
  icon?: string | null;
  color?: string | null;
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
};

export const goalsFeasibilityApi = {
  /** Soma do aporte necessário de todas as metas ATIVAS vs. sobra mensal real. */
  get: (entityId: string) => api.get<GoalsFeasibility>(`/entities/${entityId}/goals/feasibility`),
};
