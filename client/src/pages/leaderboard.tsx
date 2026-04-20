import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, RefreshCw, Trophy, Crown, Medal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
  rank: number;
  name: string;
  email: string;
  totalValue: number;
  gameCode: string;
  completedRound: number;
  date: string;
}

function formatValue(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.length > 2
    ? local[0] + "•".repeat(Math.min(local.length - 2, 4)) + local[local.length - 1]
    : local;
  return `${masked}@${domain}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#E6A100] to-[#C48800] shadow-lg shadow-[#E6A100]/30">
        <Crown className="h-5 w-5 text-white" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#9AA8B4] to-[#7B8A96]">
        <Medal className="h-5 w-5 text-white" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#B87333] to-[#96602B]">
        <Medal className="h-5 w-5 text-white" />
      </div>
    );
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F4F6F9] border border-[#D9DFE7]">
      <span className="text-sm font-bold text-[#001E41] font-mono">{rank}</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showScores, setShowScores] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("GET", "/api/leaderboard");
      const data = await res.json();
      setEntries(data.leaderboard ?? []);
      // Trigger staggered reveal
      setShowScores(false);
      setTimeout(() => setShowScores(true), 300);
    } catch (err: any) {
      setError(err.message ?? "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-[#001E41] text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-[#E6A100]" />
            <span className="font-sans font-bold tracking-wide text-sm uppercase">
              Climate Capital
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLeaderboard}
              disabled={loading}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Title section */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Star className="h-4 w-4 text-[#E6A100]" />
          <span className="text-xs uppercase tracking-[0.3em] text-[#A8D0E6] font-medium">
            Hall of Fame
          </span>
          <Star className="h-4 w-4 text-[#E6A100]" />
        </div>
        <h1 className="font-sans font-bold text-4xl tracking-tight mb-2">
          Leaderboard
        </h1>
        <div className="h-1 w-16 bg-[#0074B7] mx-auto mb-4" aria-hidden />
        <p className="text-[#A8D0E6] text-sm">
          Top climate investors across all games
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-xl border border-[#C4372C]/30 bg-[#C4372C]/10 px-4 py-3 text-sm text-[#E57373]">
            {error}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-3 text-[#A8D0E6]">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading scores...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && !error && (
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <Trophy className="h-12 w-12 text-[#9AA8B4] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No scores yet</h2>
          <p className="text-sm text-[#A8D0E6]">
            Play a game to be the first on the leaderboard.
          </p>
          <Button
            className="mt-6 bg-[#0074B7] text-white hover:bg-[#005A8E] rounded-[10px]"
            onClick={() => navigate("/")}
          >
            Start Playing
          </Button>
        </div>
      )}

      {/* Top 3 podium */}
      {!loading && topThree.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {/* 2nd place */}
            <AnimatePresence>
              {topThree[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={showScores ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex flex-col items-center mt-8"
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full text-center backdrop-blur-sm">
                    <RankBadge rank={2} />
                    <p className="font-semibold text-sm mt-3 truncate">{topThree[1].name}</p>
                    <p className="text-xs text-[#A8D0E6] mt-1 truncate">{maskEmail(topThree[1].email)}</p>
                    <p className="font-mono font-bold text-lg text-[#A8D0E6] mt-2">
                      {formatValue(topThree[1].totalValue)}
                    </p>
                    <p className="text-xs text-white/40 mt-1">Round {topThree[1].completedRound}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 1st place */}
            {topThree[0] && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={showScores ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex flex-col items-center"
              >
                <div className="bg-gradient-to-b from-[#E6A100]/10 to-transparent border border-[#E6A100]/30 rounded-xl p-5 w-full text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#E6A100]/5 to-transparent" />
                  <div className="relative">
                    <div className="mx-auto w-fit">
                      <RankBadge rank={1} />
                    </div>
                    <p className="font-bold text-base mt-3 truncate">{topThree[0].name}</p>
                    <p className="text-xs text-[#A8D0E6] mt-1 truncate">{maskEmail(topThree[0].email)}</p>
                    <p className="font-mono font-bold text-2xl text-[#E6A100] mt-3">
                      {formatValue(topThree[0].totalValue)}
                    </p>
                    <p className="text-xs text-white/40 mt-1">Round {topThree[0].completedRound}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd place */}
            <AnimatePresence>
              {topThree[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={showScores ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex flex-col items-center mt-8"
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full text-center backdrop-blur-sm">
                    <RankBadge rank={3} />
                    <p className="font-semibold text-sm mt-3 truncate">{topThree[2].name}</p>
                    <p className="text-xs text-[#A8D0E6] mt-1 truncate">{maskEmail(topThree[2].email)}</p>
                    <p className="font-mono font-bold text-lg text-[#B87333] mt-2">
                      {formatValue(topThree[2].totalValue)}
                    </p>
                    <p className="text-xs text-white/40 mt-1">Round {topThree[2].completedRound}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Rest of leaderboard */}
      {!loading && rest.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
            {rest.map((entry, idx) => (
              <motion.div
                key={`${entry.gameCode}-${entry.name}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={showScores ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.6 + idx * 0.05, duration: 0.3 }}
                className={`flex items-center gap-4 px-5 py-3.5 ${
                  idx < rest.length - 1 ? "border-b border-white/5" : ""
                } hover:bg-white/5 transition-colors`}
              >
                <RankBadge rank={entry.rank} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.name}</p>
                  <p className="text-xs text-[#A8D0E6] truncate">{maskEmail(entry.email)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm text-white">
                    {formatValue(entry.totalValue)}
                  </p>
                  <p className="text-xs text-white/40">
                    R{entry.completedRound} · {entry.gameCode}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-6 py-8 text-center border-t border-white/5">
        <p className="text-xs text-white/30">
          An educational simulation. Past performance is not a guide to future results.
        </p>
      </div>
    </div>
  );
}
