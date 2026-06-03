import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const masked =
    local.length > 2
      ? local[0] + "•".repeat(Math.min(local.length - 2, 4)) + local[local.length - 1]
      : local;
  return `${masked}@${domain}`;
}

/**
 * Compact all-time leaderboard for the mid-game nav sheet. Reuses the same
 * /api/leaderboard endpoint as the full Hall of Fame page.
 */
export function LeaderboardContent() {
  const { data, isLoading, error } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/leaderboard");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const entries = data?.leaderboard ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#E6A100]" />
        <p className="text-sm text-[#494949]">
          Top climate investors across all games.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-[#9AA8B4] py-6 text-center">Loading scores…</p>
      )}
      {error && (
        <p className="text-sm text-[#C4372C] py-6 text-center">
          Could not load the leaderboard.
        </p>
      )}
      {!isLoading && !error && entries.length === 0 && (
        <p className="text-sm text-[#9AA8B4] py-6 text-center">
          No scores yet — be the first to finish.
        </p>
      )}

      {entries.length > 0 && (
        <div className="rounded-xl border border-[#D9DFE7] overflow-hidden">
          {entries.map((entry, idx) => (
            <div
              key={`${entry.gameCode}-${entry.name}-${idx}`}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                idx % 2 === 1 ? "bg-[#F4F6F9]" : "bg-white"
              }`}
            >
              <span
                className={`w-7 text-center font-bold tabular-nums ${
                  entry.rank <= 3 ? "text-[#E6A100]" : "text-[#9AA8B4]"
                }`}
              >
                {entry.rank}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#001E41] truncate">{entry.name}</p>
                <p className="text-xs text-[#9AA8B4] truncate">
                  {maskEmail(entry.email)} · R{entry.completedRound}
                </p>
              </div>
              <span className="font-mono font-semibold text-[#001E41] tabular-nums">
                {formatValue(entry.totalValue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
