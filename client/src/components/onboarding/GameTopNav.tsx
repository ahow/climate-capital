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
import { GameJourney, type JourneyStage } from "@/components/journey/GameJourney";

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
  currentStage,
}: {
  playerName: string;
  portfolioValue: number;
  round: number;
  maxRounds: number;
  currentStage: JourneyStage;
}) {
  const [panel, setPanel] = useState<Panel>(null);

  const navLinkClass =
    "rounded-md px-2.5 py-1.5 text-xs font-medium text-[#566779] transition-colors hover:bg-[#F4F6F9] hover:text-[#001E41]";

  return (
    <>
      <nav className="border-b border-[#D9DFE7] bg-white px-4 py-2.5 flex items-center justify-between gap-4" aria-label="Game navigation">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <svg width="20" height="20" viewBox="0 0 28 28" aria-hidden>
              <circle cx="14" cy="14" r="12" fill="none" stroke="#001E41" strokeWidth="2" />
              <circle cx="14" cy="14" r="5" fill="#0074B7" />
            </svg>
            <span className="font-sans font-bold text-xs tracking-wide text-[#001E41] hidden sm:inline">
              CLIMATE CAPITAL
            </span>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              data-testid="nav-how-to-play"
              className={navLinkClass}
              onClick={() => setPanel("howToPlay")}
            >
              How it works
            </button>
            <button
              type="button"
              data-testid="nav-investment-universe"
              className={navLinkClass}
              onClick={() => setPanel("universe")}
            >
              Explore assets
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
          <div className="flex items-center gap-1 md:hidden">
            <button type="button" className={navLinkClass} onClick={() => setPanel("howToPlay")}>
              Guide
            </button>
            <button type="button" className={navLinkClass} onClick={() => setPanel("universe")}>
              Assets
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm shrink-0">
          <span className="hidden text-[#566779] sm:inline">
            Round <span className="font-semibold text-[#001E41]">{round}</span> of {maxRounds}
          </span>
          <span className="text-[#001E41] font-medium hidden sm:inline truncate max-w-[120px]">
            {playerName}
          </span>
          <span className="font-mono font-semibold text-[#0074B7] tabular-nums">
            {formatMoney(portfolioValue)}
          </span>
        </div>
      </nav>
      <GameJourney currentStage={currentStage} />

      <Sheet open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <SheetContent
          side="right"
          className="w-full p-0 overflow-y-auto bg-white sm:max-w-[70vw] lg:max-w-[52vw]"
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
                  {panel === "howToPlay" ? "How it works" : "Explore assets"}
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
