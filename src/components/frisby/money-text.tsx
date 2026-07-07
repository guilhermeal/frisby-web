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
  return (
    <span className={cn("tnum font-medium", color, className)}>
      {formatMoney(cents, currency, "pt-BR", { sign })}
    </span>
  );
}
