import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Leaf, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGame } from "@/contexts/GameContext";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [, navigate] = useLocation();
  const { setGameSession } = useGame();
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [hostName, setHostName] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showHost, setShowHost] = useState(false);

  const hostMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/games", { hostName: name });
      return res.json();
    },
    onSuccess: (data: { id: string; code: string; hostPlayerId: string }) => {
      setGameSession(data.id, data.hostPlayerId, data.code);
      navigate("/game");
    },
  });

  const joinMutation = useMutation({
    mutationFn: async ({ code, name }: { code: string; name: string }) => {
      const res = await apiRequest("POST", `/api/games/${code}/join`, {
        code,
        playerName: name,
      });
      return res.json();
    },
    onSuccess: (data: { id: string; name: string; gameId: string; gameCode: string }) => {
      setGameSession(data.gameId, data.id, data.gameCode);
      navigate("/game");
    },
  });

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mx-auto"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <Leaf className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight mb-3 bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
          CLIMATE CAPITAL
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          The Climate Investing Game
        </p>
        <p className="text-sm text-muted-foreground mb-12">
          Manage $100M across 8 rounds of real climate events. 2015&ndash;2025.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            data-testid="host-game-btn"
            size="lg"
            className="gap-2 text-base px-8 py-6"
            onClick={() => { setShowHost(true); setShowJoin(false); }}
          >
            <Play className="h-5 w-5" />
            Host a Game
          </Button>
          <Button
            data-testid="join-game-btn"
            size="lg"
            variant="outline"
            className="gap-2 text-base px-8 py-6"
            onClick={() => { setShowJoin(true); setShowHost(false); }}
          >
            <Users className="h-5 w-5" />
            Join a Game
          </Button>
        </div>

        {showHost && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="max-w-sm mx-auto border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Host a New Game</h3>
                <Input
                  data-testid="host-name-input"
                  placeholder="Your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hostName.trim()) hostMutation.mutate(hostName.trim());
                  }}
                />
                <Button
                  data-testid="create-game-btn"
                  className="w-full"
                  disabled={!hostName.trim() || hostMutation.isPending}
                  onClick={() => hostMutation.mutate(hostName.trim())}
                >
                  {hostMutation.isPending ? "Creating..." : "Create Game"}
                </Button>
                {hostMutation.isError && (
                  <p className="text-sm text-destructive">{hostMutation.error.message}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {showJoin && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="max-w-sm mx-auto border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-semibold">Join an Existing Game</h3>
                <Input
                  data-testid="join-code-input"
                  placeholder="6-character game code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <Input
                  data-testid="player-name-input"
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && joinCode.trim() && playerName.trim())
                      joinMutation.mutate({ code: joinCode.trim(), name: playerName.trim() });
                  }}
                />
                <Button
                  data-testid="join-submit-btn"
                  className="w-full"
                  disabled={!joinCode.trim() || !playerName.trim() || joinMutation.isPending}
                  onClick={() => joinMutation.mutate({ code: joinCode.trim(), name: playerName.trim() })}
                >
                  {joinMutation.isPending ? "Joining..." : "Join Game"}
                </Button>
                {joinMutation.isError && (
                  <p className="text-sm text-destructive">{joinMutation.error.message}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
