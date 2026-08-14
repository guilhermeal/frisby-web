import { cn } from "@/lib/utils";
import { formatMoney, type Currency } from "@/lib/money";

interface Props {
  /** Centavos-string da API. undefined/null não deve acontecer em contratos
   * saudáveis, mas campos calculados (ex. agregados sem histórico) já
   * chegaram ausentes por bug de backend — aceitar aqui evita derrubar a
   * página inteira (ErrorBoundary) por um valor faltando em um card. */
  cents: string | null | undefined;
  kind?: "income" | "expense" | "transfer" | "neutral";
  currency?: Currency;
  className?: string;
  sign?: boolean;
}

export function MoneyText({ cents, kind = "neutral", currency = "BRL", className, sign }: Props) {
  const color =
    kind === "income"
      ? "text-income"
      : kind === "expense"
        ? "text-expense"
        : kind === "transfer"
          ? "text-transfer"
          : "text-foreground";

  if (cents === null || cents === undefined) {
    return <span className={cn("tnum font-medium text-muted-foreground", className)}>—</span>;
  }

  // A API envia valores sempre positivos; o sinal exibido vem da natureza
  // do lançamento (despesa = "−"), não do sinal aritmético.
  const displayCents = sign && kind === "expense" && !cents.startsWith("-") ? `-${cents}` : cents;
  return (
    <span className={cn("tnum font-medium", color, className)}>
      {formatMoney(displayCents, currency, "pt-BR", { sign })}
    </span>
  );
}
