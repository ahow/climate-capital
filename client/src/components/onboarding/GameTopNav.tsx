import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HowToPlayContent } from "@/components/onboarding/HowToPlayContent";
import { InvestmentUniverseContent } from "@/components/onboarding/InvestmentUniverseContent";
import { LeaderboardContent } from "@/components/onboarding/LeaderboardContent";

type Panel = "howToPlay" | "universe" | "leaderboard" | null;

function formatMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

/**
 * Persistent mid-game top nav. The three links open the onboarding/leaderboard
 * pages as right-side sheets (overlays) rather than route changes, so the
 * player's game phase state is never lost. The page bodies are the same
 * components used by the standalone onboarding pages.
 */
export function GameTopNav({
  playerName,
  portfolioValue,
  round,
  maxRounds,
  phase,
}: {
  playerName: string;
  portfolioValue: number;
  round: number;
  maxRounds: number;
  phase: string;
}) {
  const [panel, setPanel] = useState<Panel>(null);

  const navLinkClass =
    "text-sm text-[#494949] hover:text-[#001E41] transition-colors";

  return (
    <>
      <nav className="border-b border-[#D9DFE7] bg-white px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <svg width="20" height="20" viewBox="0 0 28 28" aria-hidden>
              <circle cx="14" cy="14" r="12" fill="none" stroke="#001E41" strokeWidth="2" />
              <circle cx="14" cy="14" r="5" fill="#0074B7" />
            </svg>
            <span className="font-sans font-bold text-xs tracking-wide text-[#001E41] hidden sm:inline">
              CLIMATE CAPITAL
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              data-testid="nav-how-to-play"
              className={navLinkClass}
              onClick={() => setPanel("howToPlay")}
            >
              How to Play
            </button>
            <button
              type="button"
              data-testid="nav-investment-universe"
              className={navLinkClass}
              onClick={() => setPanel("universe")}
            >
              Investment Universe
            </button>
            <button
              type="button"
              data-testid="nav-leaderboard"
              className={navLinkClass}
              onClick={() => setPanel("leaderboard")}
            >
              Leaderboard
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm shrink-0">
          <span className="text-[#494949] hidden md:inline">
            Round <span className="text-[#001E41] font-semibold">{round}</span>/{maxRounds}
          </span>
          <span className="hidden lg:inline-flex items-center rounded-md bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-[#001E41] capitalize">
            {phase}
          </span>
          <span className="text-[#001E41] font-medium hidden sm:inline truncate max-w-[120px]">
            {playerName}
          </span>
          <span className="font-mono font-semibold text-[#0074B7] tabular-nums">
            {formatMoney(portfolioValue)}
          </span>
        </div>
      </nav>

      <Sheet open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 overflow-y-auto bg-white"
        >
          {panel === "leaderboard" ? (
            <div className="p-6">
              <SheetHeader className="mb-4">
                <SheetTitle className="text-[#001E41] font-sans">Leaderboard</SheetTitle>
              </SheetHeader>
              <LeaderboardContent />
            </div>
          ) : (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>
                  {panel === "howToPlay" ? "How to Play" : "Investment Universe"}
                </SheetTitle>
              </SheetHeader>
              {panel === "howToPlay" && <HowToPlayContent />}
              {panel === "universe" && <InvestmentUniverseContent />}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
