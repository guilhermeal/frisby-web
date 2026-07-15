// Barrel da camada de endpoints. A implementação vive em ./endpoints/<domínio>.
// Se sua API usa outros caminhos, ajuste no arquivo do domínio correspondente —
// o resto da UI não precisa mudar.

export * from "./endpoints/auth";
export * from "./endpoints/entities";
export * from "./endpoints/members";
export * from "./endpoints/accounts";
export * from "./endpoints/categories";
export * from "./endpoints/transactions";
export * from "./endpoints/cards";
export * from "./endpoints/transfers";
export * from "./endpoints/budgets";
export * from "./endpoints/reports";
export * from "./endpoints/attachments";
