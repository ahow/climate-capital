import { useState } from "react";
import { useLocation } from "wouter";
import { Trash2, Leaf, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Leaf className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Climate Capital</h1>
          </div>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Admin Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="password"
                placeholder="Admin password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLogin();
                }}
              />
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
              <Button className="w-full" onClick={handleLogin}>
                Sign In
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPlayers(ADMIN_PASSWORD)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Players Table */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              All Players{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({players.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                Loading players...
              </div>
            ) : players.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                No players found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs uppercase">Name</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Email</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Game Code</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Status</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase">Round</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.playerId} className="border-border/30">
                      <TableCell className="font-medium text-sm">{player.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{player.email}</TableCell>
                      <TableCell className="font-mono text-sm">{player.gameCode}</TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            player.gameStatus === "finished"
                              ? "bg-muted text-muted-foreground"
                              : player.gameStatus === "lobby"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-emerald-500/15 text-emerald-400"
                          }`}
                        >
                          {player.gameStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{player.currentRound}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
