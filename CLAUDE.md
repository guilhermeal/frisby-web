# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é

Frontend (React 19 + TypeScript strict + TanStack Start/Router/Query + Tailwind v4 + shadcn) do **Frisby**, um SaaS de finanças pessoais/empresariais em pt-BR. O backend real (Express + Prisma) vive em **`/media/DADOS/Dev/Guilherme/financial/server`** e roda na porta **3001** — ele é a fonte da verdade de rotas e shapes (o `API-CONTRACT.md` deste repo está desatualizado; confie no código do backend e nos manuais em `CLAUDE-DOCS/`).

## Comandos

```bash
npm run dev            # Vite dev server — sobe na porta 8081 (a 8080 está ocupada por um Tomcat local!)
npx tsc --noEmit       # typecheck (gate obrigatório antes de concluir qualquer mudança)
npx eslint --fix src/ e2e/
npx playwright test                     # E2E — EXIGE dev server (:8081) e backend (:3001) rodando
npx playwright test e2e/f2-lancamentos.spec.ts   # uma spec só
# backend: cd /media/DADOS/Dev/Guilherme/financial/server && npm run dev
```

Playwright usa o Chrome do sistema (`channel: "chrome"`), workers=1, e NÃO sobe webServer próprio. Os testes criam usuários/entidades descartáveis via API (`e2e/helpers.ts`: `apiLogin`, `loginViaApi` injeta tokens no localStorage, `uniqueEmail`). Usuário de teste persistente no banco dev: `teste.frisby@example.com` / `senha12345`.

## Arquitetura — a camada de adaptação é o coração

A UI **nunca vê os shapes do backend**. O fluxo é:

```
backend (Prisma/Express) → lib/api/endpoints/<domínio>.ts (ADAPTERS) → lib/api/types.ts (domínio da UI) → hooks/api/<domínio>.ts (React Query) → telas
```

- `src/lib/api/client.ts` — fetch com Bearer, BASE_URL fixo `"/api"` (proxy do Vite → :3001; NUNCA usar `VITE_API_URL` como base do client — ela é só o alvo do proxy em `vite.config.ts`). 401 → refresh (`{refreshToken}` camelCase) → retry → logout. Tolera erros `{error:{...}}` e `{error:"msg"}`.
- `src/lib/api/endpoints/mappers.ts` — shapes crus (`Api*`) e mapeadores. Exemplos de tradução: `currentBalance→balance`, `statementClosingDay→closingDay`, `referenceMonth→month`, `membershipId↔memberId` (rateios usam o id da MEMBERSHIP, não do user), árvore de categorias→lista flat com `parentId`.
- `src/lib/api/endpoints.ts` e `src/hooks/api.ts` são **barrels** — a implementação vive nos diretórios `endpoints/` e `hooks/api/`. Query keys centralizadas em `hooks/api/keys.ts` (`qk`); invalidações sempre via essas keys.
- Login devolve só `{accessToken, refreshToken}`; o usuário vem de `GET /me` em seguida (`lib/auth/context.tsx`). Entidade ativa em localStorage (`frisby.currentEntityId`, hook `useCurrentEntity`); toda rota escopada leva `/entities/:id` explícito.
- Permissões: `usePermissions()` cruza `GET /members` (acha a membership do user) × `GET /roles` (tem o JSON `permissions`), com wildcard igual ao backend (`transaction.*` concede filhos). Gate declarativo: `PermissionGate`. Catálogo em `PERMISSIONS` (lib/auth/use-permissions.ts).

### Divergências backend × manuais (NÃO seguir o manual nesses pontos)

- Recorrência e parcelamento são **módulos próprios** (`/entities/:id/recurrences` com shares em `shareRatio` 0–1 somando 1; `/entities/:id/installments` com `accountId` obrigatório) — não são campos do POST /transactions.
- Transfers: settle/unsettle SEMPRE sob `/entities/:entityId/transfers/:id/...` (não existe na raiz).
- A listagem de transações do backend INCLUI pernas de transferência (`transferId` preenchido) — o adapter as filtra (invariante 6).
- `notificationPrefs` não é gravável via API (switches desabilitados). Signup não aceita `timezone`. Billing checkout/portal 500 sem `STRIPE_SECRET_KEY` (UI é só leitura).
- Links de e-mail do backend → rotas públicas do front DEVEM ser: `/reset-password?token=`, `/verify-email?token=`, `/signup?invitation=`, `/invitations/:token/accept`.

## Invariantes do produto (a UI nunca viola — há specs E2E cobrindo)

1. PLANNED nunca afeta saldo; só SETTLED. 2. SETTLED exige conta de origem. 3. Compra no cartão NUNCA baixa caixa — vai para a fatura; o form trava status em PLANNED com aviso do mês da fatura. 4. Rateio soma exata = valor (submit bloqueado via `sharesSumOk`). 5. Parcelas somam exato (resto na última — o backend calcula). 6. Transferência ≠ despesa/receita. 7. Fatura CLOSED/PAID é imutável. 8. Caixa debita o valor PAGO da fatura, nunca o calculado. 9. Nunca dados de outra entidade. 10. Dinheiro SEMPRE centavos-string + BigInt — **nunca float** (`lib/money.ts`).

## Convenções de UI

- **UM componente por elemento**, responsivo por CSS — nunca duplicar mobile/desktop. Overlay único: `ResponsiveDialog` (Dialog ≥md / Drawer vaul no mobile). Dados: tabela desktop + cards mobile na mesma tela.
- Compostos reutilizáveis em `src/components/frisby/` (MoneyInput, DatePicker, MonthPicker/PeriodPicker, AccountSelect, CategorySelect, SplitBuilder, SettleDialog, TransactionForm, PayInvoiceDialog, StatusPill, EmptyState, ConfirmDialog, PermissionGate...). Primitivos shadcn em `src/components/ui/` — não editar em geral.
- Toda tela tem 3 estados: loading (skeleton), vazio (`EmptyState` com CTA), erro (`apiErrorMessage` — dicionário pt-BR em `lib/api/error-messages.ts`).
- Toda mutação: toast (sonner, montado no `__root.tsx`) + invalidação via `qk`. Em `ConfirmDialog`, o `onConfirm` deve relançar o erro para manter o diálogo aberto.
- Datas de negócio: enviar `YYYY-MM-DD`; default de hoje = `todayISO()` (fuso LOCAL — nunca `toISOString().slice()`); exibição via `formatDate` (UTC, evita mismatch de hidratação). Strings pt-BR direto no código (sem i18n por decisão do projeto).
- Rotas file-based em `src/routes/`; `routeTree.gen.ts` é gerado pelo Vite (precisa do dev server rodando para novas rotas passarem no typecheck). Guard de auth + onboarding (entities===0 → `/onboarding`) em `routes/_authenticated/route.tsx`.

## Lovable

Projeto conectado ao Lovable (ver `AGENTS.md`): **não reescrever histórico publicado** (sem force push/rebase/squash de commits já enviados) e manter a branch em estado funcional.
