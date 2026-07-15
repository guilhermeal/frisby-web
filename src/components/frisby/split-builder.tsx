// Rateio entre membros com três modos (igual / % / valor) e SOMA AO VIVO.
// Invariante 4 do produto: a soma das partes deve ser EXATAMENTE igual ao
// total — quem usa este componente bloqueia o salvar com `sharesSumOk`.
// Toda aritmética em BigInt (centavos); nunca float.

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/frisby/money-input";
import { formatMoney } from "@/lib/money";
import type { Member } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface Share {
  memberId: string;
  shareAmount: string; // centavos
}

/** A soma do rateio fecha exatamente com o total? */
export function sharesSumOk(shares: Share[], total: string): boolean {
  if (!total || shares.length === 0) return false;
  const sum = shares.reduce((acc, s) => acc + BigInt(s.shareAmount || "0"), 0n);
  return sum === BigInt(total);
}

/** Divide `total` igualmente entre n partes — resto distribuído nas primeiras. */
function splitEqually(total: bigint, n: number): bigint[] {
  const base = total / BigInt(n);
  const remainder = total % BigInt(n);
  return Array.from({ length: n }, (_, i) => base + (BigInt(i) < remainder ? 1n : 0n));
}

type Mode = "equal" | "percent" | "amount";

interface SplitBuilderProps {
  members: Member[];
  total: string; // centavos ("" enquanto o valor não foi digitado)
  value: Share[];
  onChange: (shares: Share[]) => void;
}

export function SplitBuilder({ members, total, value, onChange }: SplitBuilderProps) {
  const [mode, setMode] = useState<Mode>("equal");
  const [percents, setPercents] = useState<Record<string, string>>({});

  const selectedIds = value.map((s) => s.memberId);
  const totalBig = total ? BigInt(total) : 0n;

  const recomputeEqual = useCallback(
    (ids: string[]) => {
      if (ids.length === 0 || totalBig <= 0n) {
        onChange(ids.map((id) => ({ memberId: id, shareAmount: "0" })));
        return;
      }
      const parts = splitEqually(totalBig, ids.length);
      onChange(ids.map((id, i) => ({ memberId: id, shareAmount: parts[i].toString() })));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, onChange],
  );

  const recomputePercent = useCallback(
    (ids: string[], pct: Record<string, string>) => {
      if (ids.length === 0 || totalBig <= 0n) return;
      // Converte % → centavos; a diferença de arredondamento vai para o último.
      let acc = 0n;
      const shares = ids.map((id, i) => {
        const p = Number(pct[id] ?? "0");
        if (i === ids.length - 1) {
          const pctSum = ids.reduce((s, x) => s + Number(pct[x] ?? "0"), 0);
          // Só fecha no total quando os % somam 100 — senão mantém proporcional.
          const amount =
            Math.abs(pctSum - 100) < 0.001
              ? totalBig - acc
              : (totalBig * BigInt(Math.round(p * 100))) / 10000n;
          return { memberId: id, shareAmount: amount.toString() };
        }
        const amount = (totalBig * BigInt(Math.round(p * 100))) / 10000n;
        acc += amount;
        return { memberId: id, shareAmount: amount.toString() };
      });
      onChange(shares);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total, onChange],
  );

  // Total mudou → modos automáticos se recalculam.
  useEffect(() => {
    if (mode === "equal") recomputeEqual(selectedIds);
    if (mode === "percent") recomputePercent(selectedIds, percents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, mode]);

  function toggleMember(memberId: string, checked: boolean) {
    const ids = checked ? [...selectedIds, memberId] : selectedIds.filter((id) => id !== memberId);
    if (mode === "equal") {
      recomputeEqual(ids);
    } else if (mode === "percent") {
      recomputePercent(ids, percents);
    } else {
      onChange(
        checked
          ? [...value, { memberId, shareAmount: "0" }]
          : value.filter((s) => s.memberId !== memberId),
      );
    }
  }

  function setAmount(memberId: string, amount: string) {
    onChange(
      value.map((s) => (s.memberId === memberId ? { ...s, shareAmount: amount || "0" } : s)),
    );
  }

  function setPercent(memberId: string, pct: string) {
    const next = { ...percents, [memberId]: pct };
    setPercents(next);
    recomputePercent(selectedIds, next);
  }

  const sum = value.reduce((acc, s) => acc + BigInt(s.shareAmount || "0"), 0n);
  const diff = totalBig - sum;
  const ok = totalBig > 0n && diff === 0n && value.length > 0;

  return (
    <div className="rounded-xl border border-border/70 bg-background/50 p-3">
      {/* Modos */}
      <div className="mb-3 flex gap-1.5">
        {(
          [
            ["equal", "Igual"],
            ["percent", "%"],
            ["amount", "Valor"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              if (id === "equal") recomputeEqual(selectedIds);
              if (id === "percent") recomputePercent(selectedIds, percents);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              mode === id
                ? "border-ink bg-ink text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Membros */}
      <ul className="space-y-2">
        {members.map((member) => {
          const share = value.find((s) => s.memberId === member.id);
          const selected = !!share;
          return (
            <li key={member.id} className="flex items-center gap-2.5">
              <Checkbox
                id={`split-${member.id}`}
                checked={selected}
                onCheckedChange={(c) => toggleMember(member.id, c === true)}
              />
              <label
                htmlFor={`split-${member.id}`}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-semibold text-ink">
                  {member.initials}
                </span>
                <span className="truncate">{member.displayName}</span>
              </label>
              {selected && mode === "percent" && (
                <div className="flex w-20 items-center gap-1">
                  <Input
                    inputMode="decimal"
                    className="h-8 text-right text-xs"
                    value={percents[member.id] ?? ""}
                    onChange={(e) => setPercent(member.id, e.target.value.replace(/[^\d.,]/g, ""))}
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}
              {selected && mode === "amount" && (
                <MoneyInput
                  className="h-8 w-28 text-xs"
                  value={share.shareAmount === "0" ? "" : share.shareAmount}
                  onChange={(cents) => setAmount(member.id, cents)}
                />
              )}
              {selected && mode === "equal" && (
                <span className="tnum text-xs font-medium">{formatMoney(share.shareAmount)}</span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Soma ao vivo */}
      <div
        className={cn(
          "mt-3 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium",
          ok ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
        )}
      >
        {ok ? (
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" /> Rateio fechado
          </span>
        ) : value.length === 0 ? (
          <span>Selecione ao menos um membro</span>
        ) : (
          <span>
            {diff > 0n ? "Faltam" : "Sobram"} {formatMoney((diff < 0n ? -diff : diff).toString())}
          </span>
        )}
        <span className="tnum">
          {formatMoney(sum.toString())} / {formatMoney(total || "0")}
        </span>
      </div>
    </div>
  );
}
