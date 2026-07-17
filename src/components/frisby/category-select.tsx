// Seletor de categoria: árvore de 1 nível (subcategorias indentadas),
// filtrada pelo TIPO do lançamento — categoria de despesa não aparece em
// receita e vice-versa. Combobox com busca por nome OU código (ex. "1.1.3"
// resolve direto para "Energia") — fallback é a árvore navegável normal.

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCategories } from "@/hooks/api";
import type { TxType } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface CategorySelectProps {
  entityId: string | undefined;
  type: TxType;
  value: string | undefined;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelect({
  entityId,
  type,
  value,
  onChange,
  placeholder = "Escolha uma categoria",
  disabled,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const categoriesQ = useCategories(entityId);
  // A lista flat preserva a ordem pai → filhos.
  const categories = useMemo(
    () =>
      (categoriesQ.data ?? [])
        .filter((c) => c.type === type)
        .sort((a, b) => {
          const partsA = (a.code ?? "").split(".").map(Number);
          const partsB = (b.code ?? "").split(".").map(Number);
          const len = Math.max(partsA.length, partsB.length);
          for (let i = 0; i < len; i++) {
            const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
            if (diff !== 0) return diff;
          }
          return 0;
        }),
    [categoriesQ.data, type],
  );
  const selected = categories.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || categoriesQ.isLoading}
          className="w-full justify-between font-normal"
        >
          {categoriesQ.isLoading ? (
            "Carregando…"
          ) : selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: selected.color }}
              />
              <span className="truncate" title={selected.name}>
                {selected.name}
              </span>
              {selected.code && (
                <span className="shrink-0 text-xs text-muted-foreground">{selected.code}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue = "<id> <nome> <code>" (ver value do CommandItem abaixo).
            const needle = search.toLowerCase().trim();
            return itemValue.toLowerCase().includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por nome ou código…" />
          <CommandList>
            <CommandEmpty>
              Nenhuma categoria de {type === "EXPENSE" ? "despesa" : "receita"}.
            </CommandEmpty>
            <CommandGroup>
              {categories.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.id} ${c.name} ${c.code ?? ""}`}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === c.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className={cn("flex min-w-0 flex-1 items-center gap-2", c.parentId && "pl-3")}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate" title={c.name}>
                      {c.name}
                    </span>
                  </span>
                  {c.code && (
                    <span className="shrink-0 text-xs text-muted-foreground">{c.code}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
