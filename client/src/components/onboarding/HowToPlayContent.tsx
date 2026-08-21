import { DollarSign, Layers, Newspaper, Trophy, type LucideIcon } from "lucide-react";

interface Section {
  icon: LucideIcon;
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    icon: DollarSign,
    title: "Your Capital",
    body: "You start with $100 million to allocate across a curated universe of climate-aligned assets. Every dollar you don't invest stays as cash — it neither grows nor shrinks.",
  },
  {
    icon: Layers,
    title: "Your Choices",
    body: "The universe spans equities, ETFs, commodities and carbon markets — from pure-play renewables to fossil incumbents. Stuck on a name? The AI Research Desk answers deeper questions before you trade.",
  },
  {
    icon: Newspaper,
    title: "The Briefing & News",
    body: "Each round opens with a market briefing covering 6–12 months of real-world climate news. Adjust your portfolio based on what you learn — policy shifts, energy shocks and market sentiment all move prices.",
  },
  {
    icon: Trophy,
    title: "How You're Judged",
    body: "Your portfolio's total value (cash + holdings, marked to round-end prices) is your score. Compete against other players on the Hall of Fame leaderboard across all six rounds.",
  },
];

/**
 * Schroders-branded explainer used both as a standalone onboarding page and
 * inside the mid-game "How to Play" sheet. The optional footer (the "Next"
 * button) is supplied by the caller via `footer` so the same body works in
 * both contexts.
 */
export function HowToPlayContent({ footer }: { footer?: React.ReactNode }) {
  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="bg-[#001E41] text-white">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-10">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A8D0E6] mb-3">
            Getting started
          </span>
          <h2 className="font-sans font-bold text-3xl md:text-4xl leading-tight text-white">
            How Climate Capital works
          </h2>
          <div className="mt-4 h-1 w-16 bg-[#0074B7]" aria-hidden />
          <p className="mt-5 text-base text-white/80 max-w-2xl">
            You are the manager of a climate-focused fund navigating a decade of
            transition. Four things to know before your first allocation.
          </p>
        </div>
      </div>

      {/* 2x2 card grid */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                data-testid={`how-to-play-card-${section.title}`}
                className="rounded-xl bg-white border border-[#D9DFE7] p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-[#0074B7]/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-[#0074B7]" />
                  </div>
                  <h3 className="font-sans font-semibold text-lg text-[#001E41]">
                    {section.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-[#494949]">
                  {section.body}
                </p>
              </div>
            );
          })}
        </div>

        {footer && <div className="flex justify-center pt-10">{footer}</div>}
      </div>
    </div>
  );
}
