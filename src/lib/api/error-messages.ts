// Tradução de mensagens de erro do backend (em inglês) para pt-BR.
// O match é por prefixo case-insensitive — o backend às vezes concatena
// detalhes após a mensagem base. Mensagens não mapeadas passam intactas
// (o backend pode evoluir mais rápido que este dicionário).

import { ApiError } from "./client";

const MESSAGES: Array<[prefix: string, ptBr: string]> = [
  // Auth
  ["Invalid credentials", "E-mail ou senha inválidos."],
  ["Email already in use", "Este e-mail já está em uso."],
  ["Invalid or expired refresh token", "Sessão expirada. Entre novamente."],
  ["Invalid or expired reset token", "Link de redefinição inválido ou expirado."],
  ["Invalid or expired verification link", "Link de verificação inválido ou expirado."],
  ["Too many login attempts", "Muitas tentativas de login. Aguarde 15 minutos."],
  ["Too many requests", "Muitas requisições. Tente novamente em instantes."],
  // Contas
  [
    "Personal accounts must be created via /me/accounts",
    "Contas pessoais são criadas no seu perfil, não na empresa.",
  ],
  [
    "Account does not belong to a member of this entity",
    "A conta escolhida não pertence a um membro desta entidade.",
  ],
  [
    "payingAccountId must be a WALLET or BANK account",
    "A conta pagadora precisa ser carteira ou conta bancária.",
  ],
  ["Invalid ISO 4217 currency code", "Código de moeda inválido."],
  ["Credit card account not found", "Cartão de crédito não encontrado."],
  // Categorias
  ["Category not found in this household", "Categoria não encontrada nesta entidade."],
  ["Cannot use a deleted category", "Esta categoria foi excluída e não aceita novos lançamentos."],
  ["Category type mismatch", "O tipo da categoria não corresponde ao tipo do lançamento."],
  // Lançamentos
  [
    "Share amounts must sum to the transaction amount",
    "A soma do rateio precisa ser exatamente igual ao valor do lançamento.",
  ],
  ["shares are required when scope is MEMBERS", "Informe o rateio entre os membros."],
  ["settlementDate is required", "Informe a data da baixa."],
  [
    "accountId is required when creating a SETTLED transaction",
    "Lançamento baixado exige uma conta de origem.",
  ],
  ["amount is required", "Informe o valor."],
  ["competenceDate is required", "Informe a data de competência."],
  // Faturas
  ["Invoice must be CLOSED before payment", "A fatura precisa estar fechada antes de ser paga."],
  ["Invoice is already fully paid", "Esta fatura já está totalmente paga."],
  ["Invoice not found", "Fatura não encontrada."],
  ["paidAmountSource is required", "Informe o valor na moeda da conta pagadora."],
  // Membros/convites
  ["User not found", "Usuário não encontrado."],
  ["Only the owner can delete the entity", "Apenas o proprietário pode excluir a entidade."],
  ["Entity not found", "Entidade não encontrada."],
  // Genéricos
  ["Access denied", "Você não tem permissão para esta ação."],
  ["Forbidden", "Você não tem permissão para esta ação."],
  ["Internal server error", "Erro interno do servidor. Tente novamente."],
];

/** Traduz uma mensagem crua do backend para pt-BR (fallback: a própria mensagem). */
export function translateApiMessage(message: string): string {
  const lower = message.toLowerCase();
  for (const [prefix, ptBr] of MESSAGES) {
    if (lower.startsWith(prefix.toLowerCase())) return ptBr;
  }
  return message;
}

/** Mensagem pt-BR amigável para qualquer erro lançado pela camada de API. */
export function apiErrorMessage(
  err: unknown,
  fallback = "Algo deu errado. Tente novamente.",
): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return "Não foi possível alcançar o servidor. Verifique sua conexão.";
    return translateApiMessage(err.message);
  }
  if (err instanceof Error && err.message) return translateApiMessage(err.message);
  return fallback;
}

/** Um item de `error.details` do backend (erro de validação por campo). */
export interface FieldErrorDetail {
  path: string;
  message: string;
}

/**
 * Extrai `error.details` (formato `{path, message}[]`) de um erro da API,
 * indexado por `path`, para exibir inline nos campos do formulário.
 * Retorna `{}` se o erro não tiver detalhes estruturados (ex.: erro de rede).
 */
export function apiFieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return {};
  const out: Record<string, string> = {};
  for (const d of err.details as FieldErrorDetail[]) {
    if (d && typeof d.path === "string" && typeof d.message === "string") {
      out[d.path] = translateApiMessage(d.message);
    }
  }
  return out;
}
