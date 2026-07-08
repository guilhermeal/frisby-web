# Contrato da API — Frisby Frontend

Este documento lista **exatamente** o que o frontend chama. Se sua API real
usa outros caminhos, ajuste em `src/lib/api/endpoints.ts` (uma única mudança
propaga para tudo). Formato de erro tolerado:
`{ "error": { "code": "...", "message": "..." } }` **ou** `{ "error": "msg" }`.

Dinheiro trafega como **string em centavos** (`"12447"` = R$ 124,47).
Datas de competência trafegam como `YYYY-MM-DD`. Meses como `YYYY-MM`.

## Autenticação

| Método | Rota            | Body                                         | Response                                                     |
| ------ | --------------- | -------------------------------------------- | ------------------------------------------------------------ |
| POST   | `/auth/login`   | `{ email, password }`                        | `{ access_token, refresh_token, user: {id,name,email} }`     |
| POST   | `/auth/refresh` | `{ refresh_token }`                          | `{ access_token, refresh_token }`                            |
| POST   | `/auth/logout`  | `{}`                                         | 204                                                          |
| GET    | `/auth/me`      | —                                            | `{ id, name, email, initials? }`                             |

`Authorization: Bearer <access_token>` em todas as rotas autenticadas.
Em `401`, o client tenta refresh uma vez e reenvia; se falhar, faz logout.

## Entidades e membros

| Método | Rota                     | Response                                    |
| ------ | ------------------------ | ------------------------------------------- |
| GET    | `/entities`              | `Entity[]`                                  |
| GET    | `/members?entityId=`     | `Member[]`                                  |

## Contas e categorias

| Método | Rota                        | Response      |
| ------ | --------------------------- | ------------- |
| GET    | `/accounts?entityId=`       | `Account[]`   |
| POST   | `/accounts`                 | `Account`     |
| GET    | `/categories?entityId=`     | `Category[]`  |

## Lançamentos

| Método | Rota                                                                | Response         |
| ------ | ------------------------------------------------------------------- | ---------------- |
| GET    | `/transactions?entityId=&month=YYYY-MM&type=&status=&q=`            | `Transaction[]`  |
| POST   | `/transactions`                                                     | `Transaction`    |
| PATCH  | `/transactions/:id`                                                 | `Transaction`    |
| DELETE | `/transactions/:id`                                                 | 204              |

## Cartões e faturas

| Método | Rota                                | Body                                              | Response    |
| ------ | ----------------------------------- | ------------------------------------------------- | ----------- |
| GET    | `/cards/:cardId/invoices`           | —                                                 | `Invoice[]` |
| GET    | `/invoices/:invoiceId`              | —                                                 | `Invoice`   |
| POST   | `/invoices/:invoiceId/payments`     | `{ amount, payingAccountId, date }`               | `Invoice`   |

## Relatórios

| Método | Rota                                       | Response          |
| ------ | ------------------------------------------ | ----------------- |
| GET    | `/reports/monthly?entityId=&month=`        | `MonthlyReport`   |
| GET    | `/reports/cashflow?entityId=&months=5`     | `CashflowPoint[]` |

`MonthlyReport = { income, expense, plannedIncome, plannedExpense, net, byCategory: [{categoryId,name,color,value}] }`
`CashflowPoint = { month: "YYYY-MM", realizado, previsto }`

## CORS

O frontend chama sempre caminhos relativos (`/api/...`). No dev, o Vite faz
proxy para `VITE_API_URL`, então CORS não importa. Em produção o app é
servido do mesmo domínio; se você tiver dois domínios diferentes, habilite
CORS no backend liberando `Authorization` e `Content-Type`.

## Localhost e preview

O preview do Lovable roda em Cloudflare Workers e **não alcança 127.0.0.1**.
Para desenvolver contra a API na sua máquina, exponha-a via túnel
(`cloudflared`/`ngrok`) e cole a URL pública em `VITE_API_URL`.
