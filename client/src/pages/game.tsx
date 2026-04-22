import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Lock,
  ChevronRight, Trophy, Shield, Flame, AlertTriangle, Search,
  RefreshCw, ArrowLeft, Check, X, Info, Newspaper,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/contexts/GameContext";
import { apiRequest } from "@/lib/queryClient";
import type { GameSession, PlayerState, GameAsset, RoundBriefing, RoundTakeaway, Holding, Trade } from "@shared/schema";
import { ROUND_BRIEFINGS } from "@shared/gameData";

const AWARD_ICONS: Record<string, typeof Trophy> = {
  trophy: Trophy, "trending-up": TrendingUp, flame: Flame,
  "alert-triangle": AlertTriangle, shield: Shield, search: Search, "refresh-cw": RefreshCw,
};

function formatMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function riskColor(level: string) {
  switch (level) {
    case "low": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "medium": return "bg-amber-50 text-amber-700 border-amber-200";
    case "high": return "bg-orange-50 text-orange-700 border-orange-200";
    case "very-high": return "bg-red-50 text-red-700 border-red-200";
    default: return "";
  }
}

function sectorColor(assetClass: string) {
  switch (assetClass) {
    case "equity": return "text-[#0074B7]";
    case "etf": return "text-[#001E41]";
    case "credit": return "text-[#00875A]";
    case "infrastructure": return "text-[#E6A100]";
    case "carbon": return "text-[#494949]";
    case "thematic": return "text-[#7B2D8E]";
    default: return "text-[#494949]";
  }
}

// Helper: choose heatmap color based on round return
function heatmapColor(pct: number): string {
  if (pct > 20) return "#00875A";   // deep green
  if (pct > 5) return "#66BB6A";    // medium green
  if (pct >= -5) return "#9AA8B4";  // grey (flat)
  if (pct >= -20) return "#E57373"; // medium red
  return "#C4372C";                 // deep red
}

// ── Main Game Page ──
export default function GamePage() {
  const [, navigate] = useLocation();
  const { gameId, playerId } = useGame();

  useEffect(() => {
    if (!gameId || !playerId) navigate("/");
  }, [gameId, playerId, navigate]);

  if (!gameId || !playerId) return null;

  return (
    <div className="min-h-screen bg-white text-[#001E41]">
      <GameContent gameId={gameId} playerId={playerId} />
    </div>
  );
}

function GameContent({ gameId, playerId }: { gameId: string; playerId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: game, isLoading: gameLoading } = useQuery<GameSession>({
    queryKey: ["/api/games", gameId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/${gameId}`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const { data: player } = useQuery<PlayerState>({
    queryKey: ["/api/games", gameId, "player", playerId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/${gameId}/player/${playerId}`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const { data: assets } = useQuery<GameAsset[]>({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/assets");
      return res.json();
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/games/${gameId}/player/${playerId}/advance`,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "player", playerId] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const phaseMutation = useMutation({
    mutationFn: async (phase: string) => {
      const res = await apiRequest(
        "POST",
        `/api/games/${gameId}/player/${playerId}/phase`,
        { phase },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "player", playerId] });
    },
  });

  if (gameLoading || !game || !player || !assets) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full border-2 border-[#0074B7] border-t-transparent animate-spin" />
          <p className="text-[#494949] text-sm">Loading game...</p>
        </div>
      </div>
    );
  }

  const phase = player.phase;
  const round = player.currentRound;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top bar — white with navy text and a subtle bottom border */}
      <header className="border-b border-[#D9DFE7] bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden>
            <circle cx="14" cy="14" r="12" fill="none" stroke="#001E41" strokeWidth="2" />
            <circle cx="14" cy="14" r="5" fill="#0074B7" />
          </svg>
          <span className="font-sans font-bold text-sm tracking-wide text-[#001E41]">CLIMATE CAPITAL</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#494949]">
            Round <span className="text-[#001E41] font-semibold">{round}</span>/{game.maxRounds}
          </span>
          <span className="hidden sm:inline-flex items-center rounded-md bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-[#001E41] capitalize">
            {phase}
          </span>
          <span className="text-[#0074B7] font-semibold font-mono tabular-nums">
            {formatMoney(getPortfolioValue(player, assets, round))}
          </span>
        </div>
      </header>

      {/* Phase content */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {phase === "briefing" && (
            <BriefingPhase
              key="briefing"
              round={round}
              onContinue={() => phaseMutation.mutate("research")}
            />
          )}
          {phase === "research" && (
            <ResearchPhase
              key="research"
              game={game}
              gameId={gameId}
              playerId={playerId}
              assets={assets}
              round={round}
              onContinue={() => phaseMutation.mutate("trading")}
            />
          )}
          {phase === "trading" && (
            <TradingPhase
              key="trading"
              game={game}
              player={player}
              assets={assets}
              gameId={gameId}
              playerId={playerId}
              onSubmitDone={() => phaseMutation.mutate("results")}
            />
          )}
          {phase === "results" && (
            <ResultsPhase
              key="results"
              game={game}
              gameId={gameId}
              player={player}
              assets={assets}
              round={round}
              onContinue={() => phaseMutation.mutate("takeaways")}
            />
          )}
          {phase === "takeaways" && (
            <TakeawaysPhase
              key="takeaways"
              round={round}
              gameId={gameId}
              onNext={() => advanceMutation.mutate()}
              isLastRound={round >= game.maxRounds}
            />
          )}
          {phase === "finished" && (
            <FinishedPhase
              key="finished"
              game={game}
              gameId={gameId}
              player={player}
              assets={assets}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Helpers ──

function getAssetPrice(asset: GameAsset, round: number): number {
  if (round <= 0) return asset.startPrice;
  if (round - 1 < asset.roundPrices.length) return asset.roundPrices[round - 1];
  return asset.roundPrices[asset.roundPrices.length - 1];
}

function getPrevPrice(asset: GameAsset, round: number): number {
  if (round <= 1) return asset.startPrice;
  return asset.roundPrices[round - 2] ?? asset.startPrice;
}

function getPortfolioValue(player: PlayerState, assets: GameAsset[], round: number): number {
  let total = player.portfolio.cash;
  for (const h of player.portfolio.holdings) {
    const asset = assets.find((a) => a.id === h.assetId);
    if (asset) total += h.units * getAssetPrice(asset, round);
  }
  return total;
}

function getHoldingValue(h: Holding, assets: GameAsset[], round: number): number {
  const asset = assets.find((a) => a.id === h.assetId);
  if (!asset) return 0;
  return h.units * getAssetPrice(asset, round);
}

// ── Breaking News Ticker ──

function NewsTicker({ headlines }: { headlines: string[] }) {
  if (!headlines || headlines.length === 0) return null;
  // Duplicate the list for seamless marquee loop
  const loop = [...headlines, ...headlines];
  return (
    <div
      data-testid="news-ticker"
      className="bg-[#001E41] text-white border-y border-[#0074B7]/40 overflow-hidden relative"
      aria-label="Breaking financial news"
    >
      <div className="flex items-stretch">
        <div className="bg-[#0074B7] text-white px-4 py-2 flex items-center gap-2 shrink-0 z-10">
          <Newspaper className="h-3.5 w-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Breaking</span>
        </div>
        <div className="flex-1 overflow-hidden relative py-2">
          <div className="news-marquee">
            {loop.map((h, i) => (
              <span
                key={i}
                className="text-sm px-8 whitespace-nowrap"
              >
                <span className="text-[#A8D0E6] mr-2">●</span>
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Briefing Phase ──

// Extended briefing type that includes the optional newsHeadlines field
// (field is on the data in gameData.ts but not in the shared schema interface)
type BriefingWithNews = RoundBriefing & { newsHeadlines?: string[] };

function BriefingPhase({ round, onContinue }: { round: number; onContinue: () => void }) {
  const { data: briefing } = useQuery<BriefingWithNews>({
    queryKey: ["/api/rounds", round, "briefing"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rounds/${round}/briefing`);
      return res.json();
    },
  });

  if (!briefing) return null;

  // Fall back to static source if API didn't include newsHeadlines
  const localBriefing = ROUND_BRIEFINGS.find((b) => b.round === round) as
    | BriefingWithNews
    | undefined;
  const newsHeadlines: string[] =
    briefing.newsHeadlines ?? localBriefing?.newsHeadlines ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="bg-white"
    >
      {/* Navy hero */}
      <div className="bg-[#001E41] text-white">
        <div className="max-w-3xl mx-auto px-6 pt-12 pb-10">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A8D0E6] mb-3">
            Round {briefing.round} &nbsp;·&nbsp; Briefing
          </span>
          <h2 className="font-sans font-bold text-3xl md:text-4xl leading-tight text-white">
            {briefing.title}
          </h2>
          <div className="mt-4 h-1 w-16 bg-[#0074B7]" aria-hidden />
          <p className="mt-5 text-base text-white/80">{briefing.period}</p>
        </div>
        {/* News ticker at bottom of hero */}
        <NewsTicker headlines={newsHeadlines} />
      </div>

      {/* Body on cool-grey surface */}
      <div className="bg-[#F4F6F9] pb-12">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          <div>
            <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-[#494949] mb-3">
              Context
            </h3>
            <div className="space-y-2">
              {briefing.contextBullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
                  className="flex gap-3 p-4 rounded-lg bg-white border border-[#D9DFE7]"
                >
                  <ChevronRight className="h-4 w-4 text-[#0074B7] mt-0.5 shrink-0" />
                  <p className="text-sm leading-relaxed text-[#494949]">{bullet}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 + briefing.contextBullets.length * 0.1 }}
            className="bg-white border-l-4 border-[#0074B7] border-y border-r border-[#D9DFE7] rounded-r-lg p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0074B7] mb-1">Key question</p>
            <p className="text-base font-medium text-[#001E41] leading-snug">{briefing.keyQuestion}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + briefing.contextBullets.length * 0.1 }}
            className="flex justify-center pt-2"
          >
            <Button
              data-testid="begin-trading-btn"
              size="lg"
              onClick={onContinue}
              className="gap-2 bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] px-6 h-11"
            >
              Begin Trading <BarChart3 className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Trading Phase ──

interface PendingTrade {
  assetId: string;
  action: "buy" | "sell";
  amount: number;
}

function TradingPhase({
  game, player, assets, gameId, playerId, onSubmitDone,
}: {
  game: GameSession; player: PlayerState; assets: GameAsset[];
  gameId: string; playerId: string; onSubmitDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<GameAsset | null>(null);
  const [tradeAmount, setTradeAmount] = useState(1);
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [filter, setFilter] = useState("all");
  const round = player.currentRound;

  const submitMutation = useMutation({
    mutationFn: async (trades: Trade[]) => {
      const res = await apiRequest("POST", `/api/games/${gameId}/player/${playerId}/trades`, { trades });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "player", playerId] });
      toast({ title: "Trades submitted" });
      onSubmitDone();
    },
    onError: (err: Error) => toast({ title: "Trade error", description: err.message, variant: "destructive" }),
  });

  const portfolioValue = getPortfolioValue(player, assets, round);
  const maxPosition = portfolioValue * 0.40;

  // Calculate how much cash is available after pending buys
  const pendingBuyTotal = pendingTrades
    .filter((t) => t.action === "buy")
    .reduce((sum, t) => sum + t.amount * 1_000_000, 0);
  const availableCash = player.portfolio.cash - pendingBuyTotal;

  const filteredAssets = filter === "all"
    ? assets
    : assets.filter((a) => a.assetClass === filter);

  const assetClasses = Array.from(new Set(assets.map((a) => a.assetClass)));

  function getHoldingForAsset(assetId: string): Holding | undefined {
    return player.portfolio.holdings.find((h) => h.assetId === assetId);
  }

  function isLocked(holding: Holding | undefined, round: number): boolean {
    return !!holding && holding.lockedUntilRound > round;
  }

  function getCurrentPosition(assetId: string): number {
    const h = getHoldingForAsset(assetId);
    if (!h) return 0;
    return getHoldingValue(h, assets, round);
  }

  function openTradeDialog(asset: GameAsset) {
    const holding = getHoldingForAsset(asset.id);
    setSelectedAsset(asset);
    setTradeAmount(1);
    setTradeAction(holding ? "sell" : "buy");
  }

  function addPendingTrade() {
    if (!selectedAsset) return;
    setPendingTrades((prev) => [
      ...prev.filter((t) => t.assetId !== selectedAsset.id),
      { assetId: selectedAsset.id, action: tradeAction, amount: tradeAmount },
    ]);
    setSelectedAsset(null);
  }

  function removePendingTrade(assetId: string) {
    setPendingTrades((prev) => prev.filter((t) => t.assetId !== assetId));
  }

  function submitAllTrades() {
    const trades: Trade[] = pendingTrades.map((t) => ({
      assetId: t.assetId,
      action: t.action,
      amount: t.amount * 1_000_000,
    }));
    submitMutation.mutate(trades);
  }

  // Max buy for an asset (limited by cash and 40% position limit)
  function maxBuyUnits(asset: GameAsset): number {
    const currentPos = getCurrentPosition(asset.id);
    const posLimit = Math.max(0, maxPosition - currentPos);
    const cashLimit = availableCash;
    return Math.floor(Math.min(posLimit, cashLimit) / 1_000_000);
  }

  // Max sell for an asset
  function maxSellUnits(asset: GameAsset): number {
    const h = getHoldingForAsset(asset.id);
    if (!h) return 0;
    return Math.floor(getHoldingValue(h, assets, round) / 1_000_000);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col lg:flex-row min-h-[calc(100vh-57px)] bg-white"
    >
      {/* Left: Portfolio */}
      <div className="lg:w-80 xl:w-96 border-r border-[#D9DFE7] p-5 space-y-4 bg-[#F4F6F9] overflow-auto">
        <div>
          <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-[#494949]">Portfolio</h3>
          <div className="h-[3px] w-10 bg-[#0074B7] mt-2" aria-hidden />
        </div>

        <div className="bg-white border border-[#D9DFE7] rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#494949]">Cash</span>
            <span className="font-mono font-semibold text-[#0074B7] tabular-nums">{formatMoney(player.portfolio.cash)}</span>
          </div>
          <Separator className="bg-[#D9DFE7]" />
          {player.portfolio.holdings.length === 0 ? (
            <p className="text-xs text-[#9AA8B4] italic py-2">No holdings yet</p>
          ) : (
            <div className="space-y-1">
              {player.portfolio.holdings.map((h) => {
                const asset = assets.find((a) => a.id === h.assetId);
                if (!asset) return null;
                const value = getHoldingValue(h, assets, round);
                const locked = isLocked(h, round);
                return (
                  <div key={h.assetId} className="flex justify-between items-center text-sm py-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {locked && <Lock className="h-3 w-3 text-[#E6A100]" />}
                      <span className="truncate text-[#001E41]">{asset.name}</span>
                    </div>
                    <span className="font-mono shrink-0 text-[#001E41] tabular-nums">{formatMoney(value)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <Separator className="bg-[#D9DFE7]" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-[#001E41]">Total Value</span>
            <span className="font-mono font-bold text-[#001E41] tabular-nums">{formatMoney(portfolioValue)}</span>
          </div>
        </div>

        {/* Pending trades */}
        {pendingTrades.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#494949]">Pending Trades</h4>
            {pendingTrades.map((t) => {
              const asset = assets.find((a) => a.id === t.assetId);
              return (
                <div key={t.assetId} className="flex items-center justify-between bg-white border border-[#D9DFE7] rounded-md p-2 text-sm">
                  <div>
                    <span className={t.action === "buy" ? "text-[#00875A] font-semibold" : "text-[#C4372C] font-semibold"}>
                      {t.action.toUpperCase()}
                    </span>{" "}
                    <span className="text-[#001E41]">{asset?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#001E41] tabular-nums">${t.amount}M</span>
                    <button onClick={() => removePendingTrade(t.assetId)} className="text-[#9AA8B4] hover:text-[#C4372C]" aria-label="Remove pending trade">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button
          data-testid="submit-trades-btn"
          className="w-full bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] h-11"
          size="lg"
          onClick={submitAllTrades}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? "Submitting..." : `Submit Trades (${pendingTrades.length})`}
        </Button>
        <Button
          data-testid="skip-trading-btn"
          variant="ghost"
          className="w-full text-[#494949] hover:text-[#001E41] hover:bg-white"
          onClick={() => submitMutation.mutate([])}
          disabled={submitMutation.isPending}
        >
          Skip (Hold Current Positions)
        </Button>
      </div>

      {/* Right: Asset browser */}
      <div className="flex-1 p-5 overflow-auto bg-white">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-[#494949] mr-2">Assets</h3>
          <Button
            data-testid="filter-all"
            size="sm"
            onClick={() => setFilter("all")}
            className={
              filter === "all"
                ? "bg-[#001E41] text-white hover:bg-[#0074B7] rounded-md h-8"
                : "bg-white border border-[#D9DFE7] text-[#001E41] hover:bg-[#F4F6F9] rounded-md h-8"
            }
          >
            All
          </Button>
          {assetClasses.map((cls) => (
            <Button
              key={cls}
              data-testid={`filter-${cls}`}
              size="sm"
              className={
                (filter === cls
                  ? "bg-[#001E41] text-white hover:bg-[#0074B7] "
                  : "bg-white border border-[#D9DFE7] text-[#001E41] hover:bg-[#F4F6F9] ") +
                "capitalize rounded-md h-8"
              }
              onClick={() => setFilter(cls)}
            >
              {cls}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredAssets.map((asset) => {
            const price = getAssetPrice(asset, round);
            const prev = getPrevPrice(asset, round);
            const change = prev > 0 ? ((price - prev) / prev) * 100 : 0;
            const holding = getHoldingForAsset(asset.id);
            const locked = isLocked(holding, round);
            const hasPosition = !!holding;

            return (
              <div
                key={asset.id}
                data-testid={`asset-card-${asset.id}`}
                className={
                  "cursor-pointer transition-all rounded-xl bg-white border p-4 relative hover:shadow-sm " +
                  (hasPosition
                    ? "border-[#0074B7] ring-1 ring-[#0074B7]/20"
                    : "border-[#D9DFE7] hover:border-[#0074B7]")
                }
                onClick={() => openTradeDialog(asset)}
              >
                {asset.lockRounds > 0 && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-[#E6A100]/40 bg-[#E6A100]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#8A5A00]">
                      <Lock className="h-2.5 w-2.5" />
                      {locked ? `Locked ${holding!.lockedUntilRound - round}r` : `${asset.lockRounds}r lock`}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  <h4 className="font-sans font-semibold text-sm leading-tight text-[#001E41] pr-16">{asset.name}</h4>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-semibold tracking-wider ${sectorColor(asset.assetClass)}`}>
                      {asset.sector}
                    </span>
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${riskColor(asset.riskLevel)}`}>
                      {asset.riskLevel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono font-bold text-base text-[#001E41] tabular-nums">${price.toFixed(0)}</span>
                    <span className={`text-sm font-semibold flex items-center gap-0.5 tabular-nums ${change >= 0 ? "text-[#00875A]" : "text-[#C4372C]"}`}>
                      {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                    </span>
                  </div>

                  {hasPosition && (
                    <div className="text-[11px] text-[#0074B7] font-semibold border-t border-[#D9DFE7] pt-1.5 mt-1 tabular-nums">
                      Position: {formatMoney(getHoldingValue(holding!, assets, round))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trade Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
        {selectedAsset && (
          <DialogContent className="bg-white border-[#D9DFE7]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#001E41] font-sans">
                <span>{selectedAsset.name}</span>
                <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${riskColor(selectedAsset.riskLevel)}`}>
                  {selectedAsset.riskLevel}
                </span>
              </DialogTitle>
              <p className="text-sm text-[#494949]">{selectedAsset.description}</p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  data-testid="trade-buy-btn"
                  size="sm"
                  onClick={() => { setTradeAction("buy"); setTradeAmount(1); }}
                  className={
                    tradeAction === "buy"
                      ? "bg-[#00875A] text-white hover:bg-[#006b49] rounded-md"
                      : "bg-white border border-[#D9DFE7] text-[#001E41] hover:bg-[#F4F6F9] rounded-md"
                  }
                >
                  Buy
                </Button>
                <Button
                  data-testid="trade-sell-btn"
                  size="sm"
                  onClick={() => { setTradeAction("sell"); setTradeAmount(1); }}
                  disabled={!getHoldingForAsset(selectedAsset.id) || isLocked(getHoldingForAsset(selectedAsset.id), round)}
                  className={
                    tradeAction === "sell"
                      ? "bg-[#C4372C] text-white hover:bg-[#a3291f] rounded-md"
                      : "bg-white border border-[#D9DFE7] text-[#001E41] hover:bg-[#F4F6F9] rounded-md disabled:opacity-50"
                  }
                >
                  Sell
                </Button>
              </div>

              {isLocked(getHoldingForAsset(selectedAsset.id), round) && (
                <div className="flex items-center gap-2 p-2 rounded border border-[#E6A100]/40 bg-[#E6A100]/10 text-[#8A5A00] text-xs">
                  <Lock className="h-3.5 w-3.5" />
                  This position is locked until round {getHoldingForAsset(selectedAsset.id)!.lockedUntilRound}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#494949]">Amount</span>
                  <span className="font-mono font-semibold text-[#001E41] tabular-nums">${tradeAmount}M</span>
                </div>
                <Slider
                  data-testid="trade-slider"
                  value={[tradeAmount]}
                  onValueChange={([v]) => setTradeAmount(v)}
                  min={1}
                  max={Math.max(1, tradeAction === "buy" ? maxBuyUnits(selectedAsset) : maxSellUnits(selectedAsset))}
                  step={1}
                />
                <div className="flex justify-between text-[11px] text-[#9AA8B4]">
                  <span>$1M</span>
                  <span>
                    Max: ${tradeAction === "buy" ? maxBuyUnits(selectedAsset) : maxSellUnits(selectedAsset)}M
                  </span>
                </div>
              </div>

              {tradeAction === "buy" && (
                <div className="text-xs text-[#494949] flex items-center gap-1.5">
                  <Info className="h-3 w-3 text-[#0074B7]" />
                  Max 40% of portfolio per position ({formatMoney(maxPosition)})
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                data-testid="confirm-trade-btn"
                onClick={addPendingTrade}
                className="w-full bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] h-11"
                disabled={tradeAmount < 1}
              >
                {tradeAction === "buy" ? "Add Buy" : "Add Sell"} &mdash; ${tradeAmount}M
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </motion.div>
  );
}

// ── Research Phase ──

interface ResearchMessage {
  role: "user" | "analyst";
  content: string;
}

function ResearchPhase({
  game, gameId, playerId, assets, round, onContinue,
}: {
  game: GameSession; gameId: string; playerId: string;
  assets: GameAsset[]; round: number; onContinue: () => void;
}) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [messages, setMessages] = useState<ResearchMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const MAX_QUESTIONS = 5;

  async function askAnalyst() {
    if (!question.trim() || isLoading || questionCount >= MAX_QUESTIONS) return;
    const q = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setIsLoading(true);
    setQuestionCount((c) => c + 1);

    try {
      const body: { playerId: string; question: string; assetId?: string } = { playerId, question: q };
      if (selectedAssetId) body.assetId = selectedAssetId;
      const res = await apiRequest("POST", `/api/games/${gameId}/research`, body);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setMessages((prev) => [...prev, { role: "analyst", content: data.answer }]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setMessages((prev) => [...prev, { role: "analyst", content: "The analyst is unavailable right now. Please try again or proceed to trading." }]);
    } finally {
      setIsLoading(false);
    }
  }

  const { data: briefing } = useQuery<{ round: number; title: string; period: string }>({ 
    queryKey: ["/api/rounds", round, "briefing"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rounds/${round}/briefing`);
      return res.json();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto p-8 space-y-6 bg-white"
    >
      <div className="text-center space-y-1 pt-4">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0074B7] mb-2">Round {round}</span>
        <h2 className="font-sans font-bold text-3xl text-[#001E41]">Research Desk</h2>
        <div className="mx-auto mt-3 h-1 w-12 bg-[#0074B7]" aria-hidden />
        {briefing && <p className="text-[#494949] mt-3">{briefing.period}</p>}
        <p className="text-sm text-[#494949]">Ask our AI analyst about any investment before you trade</p>
      </div>

      {/* Chat history */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${ msg.role === "user" ? "justify-end" : "justify-start" }`}>
              {msg.role === "analyst" && (
                <div className="h-7 w-7 rounded-full bg-[#0074B7]/10 flex items-center justify-center shrink-0">
                  <Search className="h-3.5 w-3.5 text-[#0074B7]" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#001E41] text-white ml-auto"
                  : "bg-white border border-[#D9DFE7] text-[#001E41]"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-full bg-[#0074B7]/10 flex items-center justify-center shrink-0">
                <Search className="h-3.5 w-3.5 text-[#0074B7]" />
              </div>
              <div className="bg-white border border-[#D9DFE7] rounded-lg p-3 text-sm text-[#494949]">
                <span className="animate-pulse">Analyst is researching...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="bg-[#F4F6F9] border border-[#D9DFE7] rounded-xl p-5 space-y-3">
        {/* Asset selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#494949] uppercase tracking-wider">Focus on asset (optional)</label>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="w-full bg-white border border-[#D9DFE7] rounded-md px-3 py-2 text-sm text-[#001E41] focus:outline-none focus:ring-2 focus:ring-[#0074B7] focus:border-[#0074B7]"
          >
            <option value="">Any / General market question</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.name} ({a.sector})</option>
            ))}
          </select>
        </div>

        {/* Question input */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-xs font-semibold text-[#494949] uppercase tracking-wider">Your question</label>
            <span className="text-xs text-[#9AA8B4]">{question.length}/500 • {questionCount}/{MAX_QUESTIONS} used</span>
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAnalyst(); } }}
            placeholder="e.g. What are the key risks for ElectraDrive this period? What macro trends should I be aware of?"
            className="w-full bg-white border border-[#D9DFE7] rounded-md px-3 py-2 text-sm text-[#001E41] resize-none focus:outline-none focus:ring-2 focus:ring-[#0074B7] focus:border-[#0074B7] min-h-[80px]"
            disabled={isLoading || questionCount >= MAX_QUESTIONS}
          />
        </div>

        {questionCount >= MAX_QUESTIONS && (
          <p className="text-xs text-[#8A5A00] flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            Maximum questions reached for this round.
          </p>
        )}

        <Button
          onClick={askAnalyst}
          disabled={!question.trim() || isLoading || questionCount >= MAX_QUESTIONS}
          className="w-full bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] h-11"
        >
          {isLoading ? "Asking analyst..." : <><Search className="h-4 w-4 mr-2" />Ask Analyst</>}
        </Button>
      </div>

      <div className="flex justify-center pt-2">
        <Button
          data-testid="proceed-to-trading-btn"
          size="lg"
          onClick={onContinue}
          className="gap-2 bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] px-6 h-11"
        >
          Proceed to Trading <BarChart3 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ── Results Phase ──

function ResultsPhase({
  game, gameId, player, assets, round, onContinue,
}: {
  game: GameSession; gameId: string; player: PlayerState; assets: GameAsset[];
  round: number; onContinue: () => void;
}) {
  const { data: leaderboard } = useQuery<{ playerId: string; name: string; totalValue: number; rank: number }[]>({
    queryKey: ["/api/games", gameId, "leaderboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/${gameId}/leaderboard`);
      return res.json();
    },
  });

  const { data: benchmark } = useQuery<number[]>({
    queryKey: ["/api/benchmark"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/benchmark");
      return res.json();
    },
  });

  const portfolioValue = getPortfolioValue(player, assets, round);
  const prevValue = player.valueHistory.length > 0
    ? player.valueHistory[player.valueHistory.length - 1]
    : 100_000_000;
  const changeValue = portfolioValue - prevValue;
  const changePct = (changeValue / prevValue) * 100;

  // Benchmark value for this round (benchmark[round] = end of round N)
  const benchmarkValue = benchmark?.[round];
  const benchmarkPct = benchmarkValue ? ((benchmarkValue - 100_000_000) / 100_000_000) * 100 : null;
  const vsbenchmark = benchmarkValue ? portfolioValue - benchmarkValue : null;

  // Build heatmap data: each holding with its round return and current value
  const heatmapItems = player.portfolio.holdings
    .map((h) => {
      const asset = assets.find((a) => a.id === h.assetId);
      if (!asset) return null;
      const value = getHoldingValue(h, assets, round);
      const price = getAssetPrice(asset, round);
      const prev = getPrevPrice(asset, round);
      const pctChange = prev > 0 ? ((price - prev) / prev) * 100 : 0;
      return { id: h.assetId, name: asset.name, value, pct: pctChange };
    })
    .filter((x): x is { id: string; name: string; value: number; pct: number } => x !== null)
    .sort((a, b) => b.value - a.value);

  const totalInvested = heatmapItems.reduce((s, x) => s + x.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto p-8 space-y-6 bg-white"
    >
      <div className="text-center space-y-2">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0074B7] mb-1">Round {round}</span>
        <h2 className="font-sans font-bold text-3xl text-[#001E41]">Round {round} Results</h2>
        <div className="mx-auto mt-3 h-1 w-12 bg-[#0074B7]" aria-hidden />
        <div className="flex items-center justify-center gap-4 flex-wrap pt-3">
          <span className="text-3xl font-mono font-bold text-[#001E41] tabular-nums">{formatMoney(portfolioValue)}</span>
          <span className={`text-lg font-semibold tabular-nums ${changeValue >= 0 ? "text-[#00875A]" : "text-[#C4372C]"}`}>
            {changeValue >= 0 ? "+" : ""}{formatMoney(changeValue)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%)
          </span>
        </div>
        {benchmarkValue != null && benchmarkPct !== null && (
          <div className="flex items-center justify-center gap-3 text-sm flex-wrap pt-2">
            <span className="text-[#494949]">
              Benchmark: <span className="font-mono font-semibold text-[#001E41] tabular-nums">{formatMoney(benchmarkValue)}</span>
              <span className="ml-1 text-[#9AA8B4] tabular-nums">({benchmarkPct >= 0 ? "+" : ""}{benchmarkPct.toFixed(1)}% from start)</span>
            </span>
            {vsbenchmark !== null && (
              <span className={`font-semibold tabular-nums ${vsbenchmark >= 0 ? "text-[#00875A]" : "text-[#C4372C]"}`}>
                {vsbenchmark >= 0 ? "▲ Beating" : "▼ Behind"} benchmark by {formatMoney(Math.abs(vsbenchmark))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Portfolio Heatmap */}
      {heatmapItems.length > 0 && (
        <div className="bg-white border border-[#D9DFE7] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-[#494949]">Portfolio Heatmap</h3>
              <div className="h-[3px] w-10 bg-[#0074B7] mt-2" aria-hidden />
            </div>
            <span className="text-xs text-[#494949] tabular-nums">
              Invested: <span className="font-mono font-semibold text-[#001E41]">{formatMoney(totalInvested)}</span>
            </span>
          </div>
          <PortfolioHeatmap items={heatmapItems} total={totalInvested} />
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 flex-wrap text-[11px] text-[#494949]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#00875A" }} /> &gt; +20%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#66BB6A" }} /> +5 to +20%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#9AA8B4" }} /> ±5%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#E57373" }} /> -5 to -20%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: "#C4372C" }} /> &lt; -20%
            </span>
          </div>
        </div>
      )}

      {/* Holdings breakdown */}
      <div className="bg-white border border-[#D9DFE7] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D9DFE7] bg-[#F4F6F9]">
          <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-[#494949]">Holdings</h3>
        </div>
        <div className="p-5 space-y-1">
          <div className="flex justify-between text-xs py-1.5 font-semibold uppercase tracking-wider text-[#494949] border-b border-[#D9DFE7]">
            <span className="w-1/3">Asset</span>
            <span className="w-1/4 text-right">Value</span>
            <span className="w-1/4 text-right">Price Change</span>
          </div>
          <div className="flex justify-between text-sm py-2">
            <span className="w-1/3 flex items-center gap-1.5 text-[#001E41]">
              <DollarSign className="h-3.5 w-3.5 text-[#00875A]" /> Cash
            </span>
            <span className="w-1/4 text-right font-mono text-[#001E41] tabular-nums">{formatMoney(player.portfolio.cash)}</span>
            <span className="w-1/4 text-right text-[#9AA8B4]">&mdash;</span>
          </div>
          {player.portfolio.holdings.map((h, idx) => {
            const asset = assets.find((a) => a.id === h.assetId);
            if (!asset) return null;
            const value = getHoldingValue(h, assets, round);
            const price = getAssetPrice(asset, round);
            const prev = getPrevPrice(asset, round);
            const pctChange = prev > 0 ? ((price - prev) / prev) * 100 : 0;
            return (
              <div
                key={h.assetId}
                className={`flex justify-between text-sm py-2 rounded ${idx % 2 === 0 ? "bg-[#F4F6F9] px-2 -mx-2" : "px-2 -mx-2"}`}
              >
                <span className="w-1/3 truncate text-[#001E41]">{asset.name}</span>
                <span className="w-1/4 text-right font-mono text-[#001E41] tabular-nums">{formatMoney(value)}</span>
                <span className={`w-1/4 text-right font-mono tabular-nums ${pctChange >= 0 ? "text-[#00875A]" : "text-[#C4372C]"}`}>
                  {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="bg-white border border-[#D9DFE7] rounded-xl overflow-hidden">
          <div className="bg-[#001E41] text-white px-5 py-3">
            <h3 className="font-sans font-semibold text-sm uppercase tracking-wider">Leaderboard</h3>
          </div>
          <div>
            {leaderboard.slice(0, 10).map((entry, idx) => {
              const isMe = entry.playerId === player.id;
              const bg = isMe
                ? "bg-[#0074B7]/5 border-l-4 border-[#0074B7]"
                : idx % 2 === 1
                ? "bg-[#F4F6F9]"
                : "bg-white";
              return (
                <div
                  key={entry.playerId}
                  className={`flex items-center justify-between py-2.5 px-5 text-sm ${bg}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 text-center font-bold tabular-nums ${
                        entry.rank <= 3 ? "text-[#E6A100]" : "text-[#9AA8B4]"
                      }`}
                    >
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                    </span>
                    <span className="font-medium text-[#001E41]">{entry.name}</span>
                    {isMe && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#0074B7]">you</span>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-[#001E41] tabular-nums">{formatMoney(entry.totalValue)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button
          data-testid="continue-to-takeaways-btn"
          size="lg"
          onClick={onContinue}
          className="gap-2 bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] px-6 h-11"
        >
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ── Portfolio Heatmap Component ──

function PortfolioHeatmap({
  items,
  total,
}: {
  items: { id: string; name: string; value: number; pct: number }[];
  total: number;
}) {
  if (items.length === 0 || total === 0) return null;
  return (
    <div
      data-testid="portfolio-heatmap"
      className="grid gap-1"
      style={{
        gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
        gridAutoRows: "minmax(64px, auto)",
      }}
    >
      {items.map((item, i) => {
        // Span columns proportional to allocation. Min 2, max 12.
        const share = item.value / total;
        const cols = Math.max(2, Math.min(12, Math.round(share * 12)));
        const bg = heatmapColor(item.pct);
        const pctStr = `${item.pct >= 0 ? "+" : ""}${item.pct.toFixed(1)}%`;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
            className="rounded-md p-3 flex flex-col justify-between text-white min-h-[80px]"
            style={{ gridColumn: `span ${cols} / span ${cols}`, backgroundColor: bg }}
          >
            <div className="text-xs font-semibold leading-tight line-clamp-2">{item.name}</div>
            <div className="flex items-end justify-between mt-2">
              <span className="text-lg font-mono font-bold tabular-nums">{pctStr}</span>
              <span className="text-[11px] opacity-90 font-mono tabular-nums">{formatMoney(item.value)}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Takeaways Phase ──

function TakeawaysPhase({
  round, gameId, onNext, isLastRound,
}: {
  round: number; gameId: string; onNext: () => void; isLastRound: boolean;
}) {
  const { data: takeaways } = useQuery<RoundTakeaway>({
    queryKey: ["/api/rounds", round, "takeaways"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rounds/${round}/takeaways`);
      return res.json();
    },
  });

  const { data: prediction } = useQuery<{ round: number; question: string; options: string[]; correctIndex: number; explanation: string } | null>({
    queryKey: ["/api/predictions", round],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/predictions/${round}`);
        return res.json();
      } catch {
        return null;
      }
    },
  });

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  if (!takeaways) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto p-8 space-y-6 bg-white"
    >
      <div className="text-center">
        <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0074B7] mb-2">Round {round}</span>
        <h2 className="font-sans font-bold text-3xl text-[#001E41]">Round {round} Takeaways</h2>
        <div className="mx-auto mt-3 h-1 w-12 bg-[#0074B7]" aria-hidden />
      </div>

      <div className="space-y-3">
        {takeaways.takeaways.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.35 }}
            className="flex gap-3 p-4 rounded-lg bg-white border-l-4 border-[#0074B7] border-y border-r border-[#D9DFE7]"
          >
            <Check className="h-5 w-5 text-[#0074B7] mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed text-[#494949]">{t}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#F4F6F9] border border-[#D9DFE7] rounded-xl p-5">
        <p className="text-sm text-[#001E41] flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-[#0074B7]" />
          <span><strong className="font-sans font-semibold text-[#001E41]">Did You Know?</strong> <span className="text-[#494949]">{takeaways.didYouKnow}</span></span>
        </p>
      </div>

      {/* Prediction question */}
      {prediction && (
        <div className="bg-white border border-[#D9DFE7] rounded-xl p-5 space-y-4">
          <h3 className="font-sans font-semibold text-base text-[#001E41]">{prediction.question}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prediction.options.map((opt, i) => {
              const isCorrect = i === prediction.correctIndex;
              const isSelected = selectedAnswer === i;
              let cls =
                "justify-start h-auto py-2.5 px-3 text-left text-sm rounded-md border transition-colors ";
              if (showAnswer && isCorrect) {
                cls += "bg-[#00875A] text-white border-[#00875A] hover:bg-[#00875A]";
              } else if (showAnswer && isSelected && !isCorrect) {
                cls += "bg-[#C4372C] text-white border-[#C4372C] hover:bg-[#C4372C]";
              } else if (isSelected && !showAnswer) {
                cls += "bg-[#001E41] text-white border-[#001E41]";
              } else {
                cls += "bg-white text-[#001E41] border-[#D9DFE7] hover:border-[#0074B7] hover:bg-[#F4F6F9]";
              }
              return (
                <Button
                  key={i}
                  data-testid={`prediction-option-${i}`}
                  className={cls}
                  onClick={() => {
                    if (!showAnswer) {
                      setSelectedAnswer(i);
                      setShowAnswer(true);
                    }
                  }}
                >
                  {showAnswer && isCorrect && <Check className="h-4 w-4 mr-1.5 shrink-0" />}
                  {showAnswer && isSelected && !isCorrect && <X className="h-4 w-4 mr-1.5 shrink-0" />}
                  {opt}
                </Button>
              );
            })}
          </div>
          {showAnswer && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-[#494949] bg-[#F4F6F9] rounded-md p-3 border border-[#D9DFE7]"
            >
              {prediction.explanation}
            </motion.p>
          )}
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button
          data-testid="next-round-btn"
          size="lg"
          onClick={onNext}
          className="gap-2 bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] px-6 h-11"
        >
          {isLastRound ? "View Final Results" : "Next Round"} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ── Finished Phase ──

function FinishedPhase({
  game, gameId, player, assets,
}: {
  game: GameSession; gameId: string; player: PlayerState; assets: GameAsset[];
}) {
  const { clearGameSession } = useGame();
  const [, navigate] = useLocation();

  const { data: leaderboard } = useQuery<{ playerId: string; name: string; totalValue: number; rank: number }[]>({
    queryKey: ["/api/games", gameId, "leaderboard", "final"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/${gameId}/leaderboard`);
      return res.json();
    },
  });

  const { data: awards } = useQuery<{ awardId: string; name: string; icon: string; description: string; winnerId: string; winnerName: string }[]>({
    queryKey: ["/api/games", gameId, "awards"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/${gameId}/awards`);
      return res.json();
    },
  });

  const { data: benchmark } = useQuery<number[]>({
    queryKey: ["/api/benchmark"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/benchmark");
      return res.json();
    },
  });

  // Build chart data from valueHistory + benchmark
  const chartData = useMemo(() => {
    const data: { round: number; value: number; benchmark?: number }[] = [
      { round: 0, value: 100_000_000, benchmark: benchmark?.[0] ?? 100_000_000 },
    ];
    for (let i = 0; i < player.valueHistory.length; i++) {
      data.push({
        round: i + 1,
        value: player.valueHistory[i],
        benchmark: benchmark?.[i + 1],
      });
    }
    return data;
  }, [player.valueHistory, benchmark]);

  const finalValue = player.valueHistory.length > 0
    ? player.valueHistory[player.valueHistory.length - 1]
    : getPortfolioValue(player, assets, player.currentRound);

  const startingValue = 100_000_000;
  const years = 10; // 2015-2025
  const portfolioCAGR = Math.pow(finalValue / startingValue, 1 / years) - 1;
  const finalBenchmark = benchmark?.[benchmark.length - 1] ?? startingValue;
  const benchmarkCAGR = Math.pow(finalBenchmark / startingValue, 1 / years) - 1;
  const annualisedOutperformance = portfolioCAGR - benchmarkCAGR;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="bg-white"
    >
      {/* Navy hero for finale */}
      <div className="bg-[#001E41] text-white">
        <div className="max-w-5xl mx-auto px-8 pt-12 pb-10 text-center">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A8D0E6] mb-3">
            2015 – 2025 · A decade of climate investing
          </span>
          <h2 className="font-sans font-bold text-4xl md:text-5xl text-white">Game Over</h2>
          <div className="mx-auto mt-4 h-1 w-16 bg-[#0074B7]" aria-hidden />
          <div className="mt-6 flex flex-col items-center gap-1">
            <span className="text-4xl font-mono font-bold text-white tabular-nums">{formatMoney(finalValue)}</span>
            <span className={`text-xl font-semibold tabular-nums ${annualisedOutperformance >= 0 ? "text-[#66BB6A]" : "text-[#E57373]"}`}>
              {annualisedOutperformance >= 0 ? "+" : ""}{(annualisedOutperformance * 100).toFixed(1)}% p.a. vs benchmark
            </span>
            <span className="text-sm text-white/70 mt-1 tabular-nums">
              Portfolio CAGR: {(portfolioCAGR * 100).toFixed(1)}% · Benchmark CAGR: {(benchmarkCAGR * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Portfolio value chart */}
        <div className="bg-white border border-[#D9DFE7] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D9DFE7] bg-[#F4F6F9]">
            <h3 className="font-sans font-semibold text-sm uppercase tracking-wider text-[#494949]">Portfolio Value Over Time</h3>
          </div>
          <div className="p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D9DFE7" />
                  <XAxis dataKey="round" tick={{ fill: "#494949", fontSize: 12 }} tickFormatter={(v) => `R${v}`} stroke="#D9DFE7" />
                  <YAxis tick={{ fill: "#494949", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} stroke="#D9DFE7" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #D9DFE7",
                      borderRadius: "8px",
                      color: "#001E41",
                    }}
                    formatter={(value: number, name: string) => [formatMoney(value), name === "benchmark" ? "Benchmark" : "Your Portfolio"]}
                    labelFormatter={(label) => `Round ${label}`}
                  />
                  <Line type="monotone" dataKey="value" stroke="#001E41" strokeWidth={2.5} dot={{ r: 4, fill: "#001E41" }} name="Your Portfolio" />
                  <Line type="monotone" dataKey="benchmark" stroke="#0074B7" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: "#0074B7" }} name="Benchmark" />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#494949" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Final Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="bg-white border border-[#D9DFE7] rounded-xl overflow-hidden">
            <div className="bg-[#001E41] text-white px-5 py-3">
              <h3 className="font-sans font-semibold text-sm uppercase tracking-wider">Final Standings</h3>
            </div>
            <div>
              {leaderboard.map((entry, idx) => {
                const entryCAGR = Math.pow(entry.totalValue / startingValue, 1 / years) - 1;
                const entryOutperformance = entryCAGR - benchmarkCAGR;
                const playerAwards = awards?.filter((a) => a.winnerId === entry.playerId) ?? [];
                const isMe = entry.playerId === player.id;
                const bg = isMe
                  ? "bg-[#0074B7]/5 border-l-4 border-[#0074B7]"
                  : idx % 2 === 1
                  ? "bg-[#F4F6F9]"
                  : "bg-white";
                return (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between py-3 px-5 text-sm ${bg}`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 text-center font-bold tabular-nums ${
                          entry.rank <= 3 ? "text-[#E6A100]" : "text-[#9AA8B4]"
                        }`}
                      >
                        {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                      <span className="font-medium text-[#001E41]">{entry.name}</span>
                      {isMe && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#0074B7]">you</span>
                      )}
                      {playerAwards.length > 0 && (
                        <div className="flex items-center gap-1">
                          {playerAwards.map((award) => {
                            const IconComp = AWARD_ICONS[award.icon] || Trophy;
                            return (
                              <Tooltip key={award.awardId}>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">
                                    <IconComp className="h-3.5 w-3.5 text-[#9AA8B4] hover:text-[#0074B7] transition-colors" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">{award.name}</p>
                                  <p className="text-xs text-[#494949]">{award.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm tabular-nums ${entryOutperformance >= 0 ? "text-[#00875A]" : "text-[#C4372C]"}`}>
                        {entryOutperformance >= 0 ? "+" : ""}{(entryOutperformance * 100).toFixed(1)}% p.a.
                      </span>
                      <span className="font-mono font-semibold w-24 text-right text-[#001E41] tabular-nums">{formatMoney(entry.totalValue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-center pt-4 pb-8">
          <Button
            data-testid="back-to-home-btn"
            size="lg"
            onClick={() => { clearGameSession(); navigate("/"); }}
            className="gap-2 bg-white border-2 border-[#001E41] text-[#001E41] hover:bg-[#001E41] hover:text-white rounded-[10px] px-6 h-11"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
