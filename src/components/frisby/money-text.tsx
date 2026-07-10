import { cn } from "@/lib/utils";
import { formatMoney, type Currency } from "@/lib/money";

interface Props {
  cents: string;
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
  // A API envia valores sempre positivos; o sinal exibido vem da natureza
  // do lançamento (despesa = "−"), não do sinal aritmético.
  const displayCents = sign && kind === "expense" && !cents.startsWith("-") ? `-${cents}` : cents;
  return (
    <span className={cn("tnum font-medium", color, className)}>
      {formatMoney(displayCents, currency, "pt-BR", { sign })}
    </span>
  );
}
