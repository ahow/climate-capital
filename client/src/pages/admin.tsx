import { useState } from "react";
import { useLocation } from "wouter";
import { Trash2, ArrowLeft, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlayerRecord {
  gameId: string;
  gameCode: string;
  gameStatus: string;
  playerId: string;
  name: string;
  email: string;
  currentRound: number;
}

const ADMIN_PASSWORD = "BeckhamIsBest";

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [passwordInput, setPasswordInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setAuthError("");
      fetchPlayers(passwordInput);
    } else {
      setAuthError("Incorrect password.");
    }
  };

  const fetchPlayers = async (pw: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/players?password=${encodeURIComponent(pw)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to fetch players");
      }
      const data = await res.json();
      setPlayers(data.players ?? []);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (playerId: string, playerName: string) => {
    if (!window.confirm(`Delete player "${playerName}"? This cannot be undone.`)) return;
    setDeletingId(playerId);
    try {
      const res = await fetch(
        `/api/admin/players/${encodeURIComponent(playerId)}?password=${encodeURIComponent(ADMIN_PASSWORD)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Delete failed");
      }
      await fetchPlayers(ADMIN_PASSWORD);
    } catch (err: any) {
      setError(err.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white text-[#001E41] flex flex-col">
        <div className="bg-[#001E41] text-white">
          <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
            <span className="font-sans font-bold tracking-wide text-base">CLIMATE CAPITAL · ADMIN</span>
            <span className="text-xs uppercase tracking-[0.2em] text-white/70">Schroders</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <h1 className="font-sans font-bold text-2xl text-[#001E41] mb-1">Admin Access</h1>
            <div className="h-1 w-12 bg-[#0074B7] mb-6" aria-hidden />
            <div className="bg-white border border-[#D9DFE7] rounded-xl p-6 space-y-4">
              <Input
                type="password"
                placeholder="Admin password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
                className="bg-white border-[#D9DFE7] text-[#001E41] focus-visible:ring-[#0074B7] focus-visible:border-[#0074B7]"
              />
              {authError && (
                <p className="text-sm text-[#C4372C]">{authError}</p>
              )}
              <Button
                className="w-full bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px]"
                onClick={handleLogin}
              >
                Sign In
              </Button>
              <Button
                variant="ghost"
                className="w-full text-[#494949] hover:text-[#001E41]"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#001E41]">
      {/* Navy header */}
      <div className="bg-[#001E41] text-white border-b border-[#001E41]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-sans font-bold tracking-wide text-base">CLIMATE CAPITAL · ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPlayers(ADMIN_PASSWORD)}
              disabled={loading}
              className="bg-transparent border-white/40 text-white hover:bg-white hover:text-[#001E41]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/leaderboard")}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-sans font-bold text-2xl text-[#001E41]">Players</h1>
          <div className="h-1 w-12 bg-[#0074B7] mt-2" aria-hidden />
          <p className="text-sm text-[#494949] mt-3">
            {players.length} total
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-[#C4372C]/30 bg-[#C4372C]/5 px-4 py-3 text-sm text-[#C4372C]">
            {error}
          </div>
        )}

        <div className="bg-white border border-[#D9DFE7] rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#494949] text-sm">
              Loading players...
            </div>
          ) : players.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[#494949] text-sm">
              No players found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[#001E41] hover:bg-[#001E41]">
                  <TableHead className="text-white text-xs uppercase tracking-wider font-semibold">Name</TableHead>
                  <TableHead className="text-white text-xs uppercase tracking-wider font-semibold">Email</TableHead>
                  <TableHead className="text-white text-xs uppercase tracking-wider font-semibold">Game Code</TableHead>
                  <TableHead className="text-white text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                  <TableHead className="text-white text-xs uppercase tracking-wider font-semibold">Round</TableHead>
                  <TableHead className="text-white text-xs uppercase tracking-wider font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, idx) => (
                  <TableRow
                    key={player.playerId}
                    className={`border-[#D9DFE7] ${idx % 2 === 1 ? "bg-[#F4F6F9]" : "bg-white"}`}
                  >
                    <TableCell className="font-medium text-sm text-[#001E41]">{player.name}</TableCell>
                    <TableCell className="text-sm text-[#494949]">{player.email}</TableCell>
                    <TableCell className="font-mono text-sm text-[#001E41]">{player.gameCode}</TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          player.gameStatus === "finished"
                            ? "bg-[#F4F6F9] text-[#494949]"
                            : player.gameStatus === "lobby"
                            ? "bg-[#0074B7]/10 text-[#0074B7]"
                            : "bg-[#00875A]/10 text-[#00875A]"
                        }`}
                      >
                        {player.gameStatus}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-[#001E41]">{player.currentRound}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#C4372C] hover:text-[#C4372C] hover:bg-[#C4372C]/10"
                        disabled={deletingId === player.playerId}
                        onClick={() => handleDelete(player.playerId, player.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
