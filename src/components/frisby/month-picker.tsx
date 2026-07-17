// Seletores de período: MonthPicker (um mês "YYYY-MM", setas ±1) e
// PeriodPicker (intervalo from/to com presets + personalizado).

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/frisby/date-picker";
import { addMonths, currentMonth, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// MonthPicker
// ---------------------------------------------------------------------------

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (month: string) => void;
  className?: string;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(value, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <button
        type="button"
        className="min-w-32 cursor-pointer px-2 text-center text-sm font-medium capitalize"
        onClick={() => onChange(currentMonth())}
        title="Voltar ao mês atual"
      >
        {formatMonth(`${value}-01`)}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(value, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PeriodPicker
// ---------------------------------------------------------------------------

export interface Period {
  from: string; // "YYYY-MM-DD"
  to: string; // "YYYY-MM-DD"
}

/** Último dia do mês de um "YYYY-MM". */
function endOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(last).padStart(2, "0")}`;
}

const PRESETS: Array<{ id: string; label: string; range: () => Period }> = [
  {
    id: "this-month",
    label: "Este mês",
    range: () => ({ from: `${currentMonth()}-01`, to: endOfMonth(currentMonth()) }),
  },
  {
    id: "3m",
    label: "Últimos 3 meses",
    range: () => ({ from: `${addMonths(currentMonth(), -2)}-01`, to: endOfMonth(currentMonth()) }),
  },
  {
    id: "6m",
    label: "Últimos 6 meses",
    range: () => ({ from: `${addMonths(currentMonth(), -5)}-01`, to: endOfMonth(currentMonth()) }),
  },
  {
    id: "12m",
    label: "Últimos 12 meses",
    range: () => ({ from: `${addMonths(currentMonth(), -11)}-01`, to: endOfMonth(currentMonth()) }),
  },
  {
    id: "year",
    label: "Este ano",
    range: () => {
      const y = currentMonth().slice(0, 4);
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    },
  },
];

function matchPreset(value: Period): string {
  const hit = PRESETS.find((p) => {
    const r = p.range();
    return r.from === value.from && r.to === value.to;
  });
  return hit?.id ?? "custom";
}

interface PeriodPickerProps {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
}

export function PeriodPicker({ value, onChange, className }: PeriodPickerProps) {
  const [preset, setPreset] = useState<string>(() => matchPreset(value));

  function selectPreset(id: string) {
    setPreset(id);
    const found = PRESETS.find((p) => p.id === id);
    if (found) onChange(found.range());
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Select value={preset} onValueChange={selectPreset}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <DatePicker
            value={value.from}
            onChange={(from) => onChange({ ...value, from })}
            className="w-36"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <DatePicker
            value={value.to}
            onChange={(to) => onChange({ ...value, to })}
            className="w-36"
          />
        </div>
      )}
    </div>
  );
}
