// Input de dinheiro em centavos-string (nunca float). O usuário digita
// dígitos e o valor "entra pela direita": 1 → R$ 0,01 · 12447 → R$ 124,47.
// `value` é sempre a string de centavos ("12447"/"-12447") ou "" quando vazio.

import { forwardRef } from "react";
import { Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney, type Currency } from "@/lib/money";

interface MoneyInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> {
  value: string;
  onChange: (cents: string) => void;
  currency?: Currency;
  /** Permite alternar o sinal (estorno, saldo devedor). Default: false. */
  allowNegative?: boolean;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, currency = "BRL", className, placeholder, allowNegative, ...props },
  ref,
) {
  const isNegative = value.startsWith("-");
  const digitsOnly = value.replace("-", "");
  const display = digitsOnly ? formatMoney(value, currency) : "";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Extrai só os dígitos do texto formatado — backspace, colar e digitação
    // funcionam naturalmente porque o estado é derivado dos dígitos.
    const digits = e.target.value
      .replace(/\D/g, "")
      .replace(/^0+(?=\d)/, "")
      .slice(0, 13);
    onChange(allowNegative && isNegative && digits ? `-${digits}` : digits);
  }

  function toggleSign() {
    if (!digitsOnly) return;
    onChange(isNegative ? digitsOnly : `-${digitsOnly}`);
  }

  return (
    <div className="relative">
      {allowNegative && (
        <button
          type="button"
          onClick={toggleSign}
          aria-label={isNegative ? "Tornar positivo" : "Tornar negativo (estorno)"}
          aria-pressed={isNegative}
          className={cn(
            "absolute left-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md border text-xs transition-colors",
            isNegative
              ? "border-expense bg-expense/10 text-expense"
              : "border-border text-muted-foreground hover:bg-secondary",
          )}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      )}
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        placeholder={placeholder ?? formatMoney("0", currency)}
        className={cn(
          "tnum text-right font-medium",
          allowNegative && "pl-9",
          isNegative && "text-expense",
          className,
        )}
        {...props}
      />
    </div>
  );
});
