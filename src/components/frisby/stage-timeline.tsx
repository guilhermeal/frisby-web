// Linha do tempo horizontal das fases do fluxo — gamificação leve (sem
// pontos/ranking/streaks). A fase atual é destacada; anteriores (pela ordem)
// aparecem percorridas, posteriores ficam esmaecidas.

import type { StageRef } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function StageTimeline({
  stages,
  currentStageId,
}: {
  stages: StageRef[];
  currentStageId: string | null;
}) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const currentIdx = sorted.findIndex((s) => s.id === currentStageId);

  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-0">
        {sorted.map((stage, idx) => {
          const isCurrent = stage.id === currentStageId;
          const isPast = currentIdx >= 0 && idx < currentIdx;
          return (
            <li key={stage.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5 px-1">
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold text-white transition-all",
                    isCurrent && "h-8 w-8 ring-2 ring-offset-2 ring-offset-background",
                  )}
                  style={{
                    backgroundColor: stage.color ?? "var(--color-brand)",
                    borderColor: stage.color ?? "var(--color-brand)",
                    opacity: isPast || isCurrent ? 1 : 0.4,
                    ...(isCurrent
                      ? ({ "--tw-ring-color": stage.color ?? "var(--color-brand)" } as Record<
                          string,
                          string
                        >)
                      : {}),
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  className={cn(
                    "max-w-20 truncate text-center text-[11px]",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                    !isPast && !isCurrent && "opacity-60",
                  )}
                  title={stage.name}
                >
                  {stage.name}
                </span>
              </div>
              {idx < sorted.length - 1 && (
                <div
                  className={cn("h-0.5 w-8 shrink-0 sm:w-12", isPast ? "bg-brand" : "bg-border")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
