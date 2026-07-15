// Seletor de categoria: árvore de 1 nível (subcategorias indentadas),
// filtrada pelo TIPO do lançamento — categoria de despesa não aparece em
// receita e vice-versa.

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const categoriesQ = useCategories(entityId);
  // A lista flat preserva a ordem pai → filhos.
  const categories = (categoriesQ.data ?? []).filter((c) => c.type === type);

  return (
    <Select
      value={value ?? ""}
      onValueChange={onChange}
      disabled={disabled || categoriesQ.isLoading}
    >
      <SelectTrigger>
        <SelectValue placeholder={categoriesQ.isLoading ? "Carregando…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Nenhuma categoria de {type === "EXPENSE" ? "despesa" : "receita"}.
          </div>
        )}
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className={cn("flex items-center gap-2", c.parentId && "pl-5")}>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
