import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Clock, Lock,
  ChevronRight, Trophy, Shield, Flame, AlertTriangle, Search,
  RefreshCw, ArrowLeft, Leaf, Check, X, Info,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useGame } from "@/contexts/GameContext";
import { apiRequest } from "@/lib/queryClient";
import type { GameSession, PlayerState, GameAsset, RoundBriefing, RoundTakeaway, Holding, Trade } from "@shared/schema";

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
    case "low": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "very-high": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "";
  }
}

function sectorColor(assetClass: string) {
  switch (assetClass) {
    case "equity": return "text-blue-400";
    case "etf": return "text-indigo-400";
    case "credit": return "text-emerald-400";
    case "infrastructure": return "text-amber-400";
    case "carbon": return "text-yellow-400";
    case "thematic": return "text-purple-400";
    default: return "text-muted-foreground";
  }
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
    <div className="dark min-h-screen bg-background text-foreground">
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
      const res = await apiRequest("POST", `/api/games/${gameId}/advance`);
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
      const res = await apiRequest("POST", `/api/games/${gameId}/phase`, { phase });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
    },
  });

  if (gameLoading || !game || !player || !assets) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Leaf className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  const phase = game.status;
  const round = game.currentRound;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="border-b border-border/50 px-4 py-3 flex items-center justify-between bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Leaf className="h-5 w-5 text-primary" />
          <span className="font-bold text-sm tracking-wide">CLIMATE CAPITAL</span>
          <Badge variant="outline" className="text-xs">
            {game.code}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Round <span className="text-foreground font-semibold">{round}</span>/{game.maxRounds}
          </span>
          <Badge variant="secondary" className="capitalize">
            {phase}
          </Badge>
          <span className="text-primary font-semibold">
            {formatMoney(getPortfolioValue(player, assets, round))}
          </span>
        </div>
      </header>

      {/* Phase content */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {phase === "lobby" && (
            <LobbyPhase
              key="lobby"
              game={game}
              onStart={() => phaseMutation.mutate("briefing")}
            />
          )}
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

// ── Lobby Phase ──

function LobbyPhase({ game, onStart }: { game: GameSession; onStart: () => void }) {
  const playerList = Object.values(game.players);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] p-8"
    >
      <Card className="max-w-md w-full border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Game Lobby</CardTitle>
          <p className="text-muted-foreground">
            Share code <span className="font-mono font-bold text-primary text-lg">{game.code}</span> to invite players
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Players ({playerList.length})</p>
            {playerList.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1.5 px-3 rounded bg-muted/50">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm font-medium">{p.name}</span>
              </div>
            ))}
          </div>
          <Button data-testid="start-game-btn" className="w-full" size="lg" onClick={onStart}>
            Start Game <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Briefing Phase ──

function BriefingPhase({ round, onContinue }: { round: number; onContinue: () => void }) {
  const { data: briefing } = useQuery<RoundBriefing>({
    queryKey: ["/api/rounds", round, "briefing"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/rounds/${round}/briefing`);
      return res.json();
    },
  });

  if (!briefing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto p-8 space-y-8"
    >
      <div className="text-center space-y-2 pt-8">
        <Badge variant="outline" className="text-xs mb-2">Round {briefing.round}</Badge>
        <h2 className="text-4xl font-bold">{briefing.title}</h2>
        <p className="text-lg text-muted-foreground">{briefing.period}</p>
      </div>

      <div className="space-y-3">
        {briefing.contextBullets.map((bullet, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
            className="flex gap-3 p-3 rounded-lg bg-card border border-border/50"
          >
            <ChevronRight className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{bullet}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + briefing.contextBullets.length * 0.15 }}
        className="bg-primary/10 border border-primary/20 rounded-lg p-4"
      >
        <p className="text-sm font-medium text-primary">{briefing.keyQuestion}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 + briefing.contextBullets.length * 0.15 }}
        className="flex justify-center pt-4"
      >
        <Button data-testid="begin-trading-btn" size="lg" onClick={onContinue} className="gap-2">
          Begin Trading <BarChart3 className="h-4 w-4" />
        </Button>
      </motion.div>
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
  const round = game.currentRound;

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
      className="flex flex-col lg:flex-row min-h-[calc(100vh-57px)]"
    >
      {/* Left: Portfolio */}
      <div className="lg:w-80 xl:w-96 border-r border-border/50 p-4 space-y-4 bg-card/30 overflow-auto">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Portfolio</h3>

        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Cash</span>
              <span className="font-mono font-semibold text-primary">{formatMoney(player.portfolio.cash)}</span>
            </div>
            <Separator />
            {player.portfolio.holdings.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No holdings yet</p>
            ) : (
              player.portfolio.holdings.map((h) => {
                const asset = assets.find((a) => a.id === h.assetId);
                if (!asset) return null;
                const value = getHoldingValue(h, assets, round);
                const locked = isLocked(h, round);
                return (
                  <div key={h.assetId} className="flex justify-between items-center text-sm py-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {locked && <Lock className="h-3 w-3 text-yellow-500" />}
                      <span className="truncate">{asset.name}</span>
                    </div>
                    <span className="font-mono shrink-0">{formatMoney(value)}</span>
                  </div>
                );
              })
            )}
            <Separator />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Value</span>
              <span className="font-mono text-primary">{formatMoney(portfolioValue)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending trades */}
        {pendingTrades.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Trades</h4>
            {pendingTrades.map((t) => {
              const asset = assets.find((a) => a.id === t.assetId);
              return (
                <div key={t.assetId} className="flex items-center justify-between bg-muted/50 rounded p-2 text-sm">
                  <div>
                    <span className={t.action === "buy" ? "text-emerald-400" : "text-red-400"}>
                      {t.action.toUpperCase()}
                    </span>{" "}
                    <span>{asset?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">${t.amount}M</span>
                    <button onClick={() => removePendingTrade(t.assetId)} className="text-muted-foreground hover:text-destructive">
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
          className="w-full"
          size="lg"
          onClick={submitAllTrades}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending ? "Submitting..." : `Submit Trades (${pendingTrades.length})`}
        </Button>
        <Button
          data-testid="skip-trading-btn"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => submitMutation.mutate([])}
          disabled={submitMutation.isPending}
        >
          Skip (Hold Current Positions)
        </Button>
      </div>

      {/* Right: Asset browser */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mr-2">Assets</h3>
          <Button
            data-testid="filter-all"
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          {assetClasses.map((cls) => (
            <Button
              key={cls}
              data-testid={`filter-${cls}`}
              variant={filter === cls ? "default" : "outline"}
              size="sm"
              className="capitalize"
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
              <Card
                key={asset.id}
                data-testid={`asset-card-${asset.id}`}
                className="cursor-pointer hover:border-primary/40 transition-colors border-border/50 relative"
                onClick={() => openTradeDialog(asset)}
              >
                {asset.lockRounds > 0 && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                      <Lock className="h-2.5 w-2.5 mr-0.5" />
                      {locked ? `Locked ${holding!.lockedUntilRound - round}r` : `${asset.lockRounds}r lock`}
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm leading-tight">{asset.name}</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{asset.realBasis}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-medium ${sectorColor(asset.assetClass)}`}>
                      {asset.sector}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${riskColor(asset.riskLevel)}`}>
                      {asset.riskLevel}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono font-semibold">${price.toFixed(0)}</span>
                    <span className={`text-sm font-medium flex items-center gap-0.5 ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                    </span>
                  </div>

                  {hasPosition && (
                    <div className="text-[11px] text-primary font-medium border-t border-border/30 pt-1.5 mt-1">
                      Position: {formatMoney(getHoldingValue(holding!, assets, round))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trade Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}>
        {selectedAsset && (
          <DialogContent className="dark">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{selectedAsset.name}</span>
                <Badge variant="outline" className={`text-[10px] ${riskColor(selectedAsset.riskLevel)}`}>
                  {selectedAsset.riskLevel}
                </Badge>
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{selectedAsset.description}</p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  data-testid="trade-buy-btn"
                  variant={tradeAction === "buy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTradeAction("buy"); setTradeAmount(1); }}
                >
                  Buy
                </Button>
                <Button
                  data-testid="trade-sell-btn"
                  variant={tradeAction === "sell" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setTradeAction("sell"); setTradeAmount(1); }}
                  disabled={!getHoldingForAsset(selectedAsset.id) || isLocked(getHoldingForAsset(selectedAsset.id), round)}
                >
                  Sell
                </Button>
              </div>

              {isLocked(getHoldingForAsset(selectedAsset.id), round) && (
                <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 text-yellow-500 text-xs">
                  <Lock className="h-3.5 w-3.5" />
                  This position is locked until round {getHoldingForAsset(selectedAsset.id)!.lockedUntilRound}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold">${tradeAmount}M</span>
                </div>
                <Slider
                  data-testid="trade-slider"
                  value={[tradeAmount]}
                  onValueChange={([v]) => setTradeAmount(v)}
                  min={1}
                  max={Math.max(1, tradeAction === "buy" ? maxBuyUnits(selectedAsset) : maxSellUnits(selectedAsset))}
                  step={1}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>$1M</span>
                  <span>
                    Max: ${tradeAction === "buy" ? maxBuyUnits(selectedAsset) : maxSellUnits(selectedAsset)}M
                  </span>
                </div>
              </div>

              {tradeAction === "buy" && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3 w-3" />
                  Max 40% of portfolio per position ({formatMoney(maxPosition)})
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                data-testid="confirm-trade-btn"
                onClick={addPendingTrade}
                className="w-full"
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
      className="max-w-3xl mx-auto p-8 space-y-6"
    >
      <div className="text-center space-y-1 pt-4">
        <Badge variant="outline" className="text-xs mb-2">Round {round}</Badge>
        <h2 className="text-3xl font-bold">Research Desk</h2>
        {briefing && <p className="text-muted-foreground">{briefing.period}</p>}
        <p className="text-sm text-muted-foreground">Ask our AI analyst about any investment before you trade</p>
      </div>

      {/* Chat history */}
      {messages.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${ msg.role === "user" ? "justify-end" : "justify-start" }`}>
              {msg.role === "analyst" && (
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Search className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary/20 text-foreground ml-auto"
                  : "bg-card border border-border/50 text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Search className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border/50 rounded-lg p-3 text-sm text-muted-foreground">
                <span className="animate-pulse">Analyst is researching...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <Card className="border-border/50">
        <CardContent className="pt-4 space-y-3">
          {/* Asset selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Focus on asset (optional)</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Your question</label>
              <span className="text-xs text-muted-foreground">{question.length}/500 • {questionCount}/{MAX_QUESTIONS} questions used</span>
            </div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAnalyst(); } }}
              placeholder="e.g. What are the key risks for ElectraDrive this period? What macro trends should I be aware of?"
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
              disabled={isLoading || questionCount >= MAX_QUESTIONS}
            />
          </div>

          {questionCount >= MAX_QUESTIONS && (
            <p className="text-xs text-yellow-500 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Maximum questions reached for this round.
            </p>
          )}

          <Button
            onClick={askAnalyst}
            disabled={!question.trim() || isLoading || questionCount >= MAX_QUESTIONS}
            className="w-full"
          >
            {isLoading ? "Asking analyst..." : <><Search className="h-4 w-4 mr-2" />Ask Analyst</>}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-center pt-2">
        <Button data-testid="proceed-to-trading-btn" size="lg" onClick={onContinue} className="gap-2">
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

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-4xl mx-auto p-8 space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Round {round} Results</h2>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="text-2xl font-mono font-bold text-primary">{formatMoney(portfolioValue)}</span>
          <span className={`text-lg font-semibold ${changeValue >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {changeValue >= 0 ? "+" : ""}{formatMoney(changeValue)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%)
          </span>
        </div>
        {benchmarkValue != null && benchmarkPct !== null && (
          <div className="flex items-center justify-center gap-3 text-sm flex-wrap pt-1">
            <span className="text-muted-foreground">
              Benchmark: <span className="font-mono font-semibold text-foreground">{formatMoney(benchmarkValue)}</span>
              <span className="ml-1 text-muted-foreground">({benchmarkPct >= 0 ? "+" : ""}{benchmarkPct.toFixed(1)}% from start)</span>
            </span>
            {vsbenchmark !== null && (
              <span className={`font-semibold ${vsbenchmark >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {vsbenchmark >= 0 ? "▲ Beating" : "▼ Behind"} benchmark by {formatMoney(Math.abs(vsbenchmark))}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Holdings breakdown */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Holdings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm py-1.5 text-muted-foreground border-b border-border/30">
            <span className="w-1/3">Asset</span>
            <span className="w-1/4 text-right">Value</span>
            <span className="w-1/4 text-right">Price Change</span>
          </div>
          <div className="flex justify-between text-sm py-1.5">
            <span className="w-1/3 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Cash
            </span>
            <span className="w-1/4 text-right font-mono">{formatMoney(player.portfolio.cash)}</span>
            <span className="w-1/4 text-right text-muted-foreground">&mdash;</span>
          </div>
          {player.portfolio.holdings.map((h) => {
            const asset = assets.find((a) => a.id === h.assetId);
            if (!asset) return null;
            const value = getHoldingValue(h, assets, round);
            const price = getAssetPrice(asset, round);
            const prev = getPrevPrice(asset, round);
            const pctChange = prev > 0 ? ((price - prev) / prev) * 100 : 0;
            return (
              <div key={h.assetId} className="flex justify-between text-sm py-1.5">
                <span className="w-1/3 truncate">{asset.name}</span>
                <span className="w-1/4 text-right font-mono">{formatMoney(value)}</span>
                <span className={`w-1/4 text-right font-mono ${pctChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {leaderboard.slice(0, 10).map((entry) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center justify-between py-2 px-3 rounded text-sm ${
                    entry.playerId === player.id ? "bg-primary/10 border border-primary/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-muted-foreground">
                      {entry.rank === 1 ? "🏆" : `#${entry.rank}`}
                    </span>
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  <span className="font-mono font-semibold">{formatMoney(entry.totalValue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-4">
        <Button data-testid="continue-to-takeaways-btn" size="lg" onClick={onContinue} className="gap-2">
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
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
      className="max-w-3xl mx-auto p-8 space-y-6"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Round {round} Takeaways</h2>
      </div>

      <div className="space-y-3">
        {takeaways.takeaways.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.4 }}
            className="flex gap-3 p-3 rounded-lg bg-card border border-border/50"
          >
            <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">{t}</p>
          </motion.div>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-primary flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span><strong>Did You Know?</strong> {takeaways.didYouKnow}</span>
          </p>
        </CardContent>
      </Card>

      {/* Prediction question */}
      {prediction && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">{prediction.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {prediction.options.map((opt, i) => {
                const isCorrect = i === prediction.correctIndex;
                const isSelected = selectedAnswer === i;
                let variant: "outline" | "default" | "destructive" = "outline";
                if (showAnswer && isCorrect) variant = "default";
                if (showAnswer && isSelected && !isCorrect) variant = "destructive";

                return (
                  <Button
                    key={i}
                    data-testid={`prediction-option-${i}`}
                    variant={isSelected && !showAnswer ? "default" : variant}
                    className="justify-start h-auto py-2 text-left"
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
                className="text-sm text-muted-foreground bg-muted/50 rounded p-3"
              >
                {prediction.explanation}
              </motion.p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-4">
        <Button data-testid="next-round-btn" size="lg" onClick={onNext} className="gap-2">
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
    : getPortfolioValue(player, assets, game.currentRound);

  const startingValue = 100_000_000;
  const years = 10; // 2015-2025
  const portfolioCAGR = Math.pow(finalValue / startingValue, 1 / years) - 1;
  const finalBenchmark = benchmark?.[benchmark.length - 1] ?? startingValue;
  const benchmarkCAGR = Math.pow(finalBenchmark / startingValue, 1 / years) - 1;
  const annualisedOutperformance = portfolioCAGR - benchmarkCAGR;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="max-w-5xl mx-auto p-8 space-y-8"
    >
      <div className="text-center space-y-2 pt-4">
        <h2 className="text-4xl font-bold">Game Over</h2>
        <p className="text-muted-foreground">2015 &ndash; 2025: A decade of climate investing</p>
        <div className="flex flex-col items-center gap-1 pt-2">
          <span className="text-3xl font-mono font-bold text-primary">{formatMoney(finalValue)}</span>
          <span className={`text-xl font-semibold ${annualisedOutperformance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {annualisedOutperformance >= 0 ? "+" : ""}{(annualisedOutperformance * 100).toFixed(1)}% p.a. vs benchmark
          </span>
          <span className="text-sm text-muted-foreground">
            Portfolio CAGR: {(portfolioCAGR * 100).toFixed(1)}% | Benchmark CAGR: {(benchmarkCAGR * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Portfolio value chart */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Portfolio Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="round" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R${v}`} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number, name: string) => [formatMoney(value), name === "benchmark" ? "Benchmark" : "Your Portfolio"]}
                  labelFormatter={(label) => `Round ${label}`}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} name="Your Portfolio" />
                <Line type="monotone" dataKey="benchmark" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: "hsl(var(--muted-foreground))" }} name="Benchmark" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Final Leaderboard */}
      {leaderboard && leaderboard.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Final Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {leaderboard.map((entry) => {
                const entryCAGR = Math.pow(entry.totalValue / startingValue, 1 / years) - 1;
                const entryOutperformance = entryCAGR - benchmarkCAGR;
                const playerAwards = awards?.filter((a) => a.winnerId === entry.playerId) ?? [];
                return (
                  <div
                    key={entry.playerId}
                    className={`flex items-center justify-between py-2.5 px-3 rounded text-sm ${
                      entry.playerId === player.id ? "bg-primary/10 border border-primary/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-center font-bold text-muted-foreground">
                        {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                      <span className="font-medium">{entry.name}</span>
                      {playerAwards.length > 0 && (
                        <div className="flex items-center gap-1">
                          {playerAwards.map((award) => {
                            const IconComp = AWARD_ICONS[award.icon] || Trophy;
                            return (
                              <Tooltip key={award.awardId}>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help">
                                    <IconComp className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold">{award.name}</p>
                                  <p className="text-xs text-muted-foreground">{award.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm ${entryOutperformance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {entryOutperformance >= 0 ? "+" : ""}{(entryOutperformance * 100).toFixed(1)}% p.a.
                      </span>
                      <span className="font-mono font-semibold w-24 text-right">{formatMoney(entry.totalValue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-4 pb-8">
        <Button
          data-testid="back-to-home-btn"
          variant="outline"
          size="lg"
          onClick={() => { clearGameSession(); navigate("/"); }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
      </div>
    </motion.div>
  );
}
