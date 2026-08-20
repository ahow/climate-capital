import { Check, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

export type JourneyStage = "briefing" | "research" | "allocate" | "review" | "results";

const STAGES: { id: JourneyStage; label: string; description: string }[] = [
  { id: "briefing", label: "Briefing", description: "Read the market" },
  { id: "research", label: "Research", description: "Investigate the options" },
  { id: "allocate", label: "Allocate", description: "Build a portfolio" },
  { id: "review", label: "Review", description: "Check before committing" },
  { id: "results", label: "Results", description: "Understand the outcome" },
];

export function GameJourney({ currentStage }: { currentStage: JourneyStage }) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === currentStage);

  return (
    <div className="border-b border-[#D9DFE7] bg-[#F7F9FB]" aria-label="Round progress">
      <div className="mx-auto max-w-[1400px] px-4 py-3">
        <div className="sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0074B7]">
                Step {currentIndex + 1} of {STAGES.length}
              </p>
              <p className="text-sm font-semibold text-[#001E41]">
                {STAGES[currentIndex]?.label}
              </p>
            </div>
            <p className="text-right text-xs text-[#647487]">
              {STAGES[currentIndex]?.description}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden>
            {STAGES.map((stage, index) => (
              <span
                key={stage.id}
                className={cn(
                  "h-1 rounded-full",
                  index <= currentIndex ? "bg-[#0074B7]" : "bg-[#D9DFE7]",
                )}
              />
            ))}
          </div>
        </div>

        <ol className="hidden sm:grid sm:grid-cols-5 sm:gap-2">
          {STAGES.map((stage, index) => {
            const isCurrent = stage.id === currentStage;
            const isComplete = index < currentIndex;
            const isFuture = index > currentIndex;
            return (
              <li
                key={stage.id}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-3 py-2",
                  isCurrent && "bg-white shadow-sm ring-1 ring-[#0074B7]/20",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    isComplete && "border-[#0074B7] bg-[#0074B7] text-white",
                    isCurrent && "border-[#001E41] bg-[#001E41] text-white",
                    isFuture && "border-[#D9DFE7] bg-white text-[#7B8998]",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : isFuture ? (
                    <LockKeyhole className="h-3 w-3" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-xs font-semibold",
                      isCurrent || isComplete ? "text-[#001E41]" : "text-[#647487]",
                    )}
                  >
                    {stage.label}
                  </span>
                  <span className="block truncate text-[10px] text-[#7B8998]">
                    {stage.description}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function StickyActionBar({
  summary,
  secondary,
  primary,
}: {
  summary: React.ReactNode;
  secondary?: React.ReactNode;
  primary: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-[#D9DFE7] bg-white/95 shadow-[0_-10px_30px_rgba(0,30,65,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm text-[#494949]">{summary}</div>
        <div className="flex items-center gap-3 sm:justify-end">
          {secondary}
          <div className="flex-1 sm:flex-none">{primary}</div>
        </div>
      </div>
    </div>
  );
}
