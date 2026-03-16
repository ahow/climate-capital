import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [, navigate] = useLocation();
  const { setGameSession } = useGame();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");

  const joinMutation = useMutation({
    mutationFn: async ({ playerName, email }: { playerName: string; email: string }) => {
      const res = await apiRequest("POST", "/api/join", { playerName, email });
      return res.json();
    },
    onSuccess: (data: { gameId: string; playerId: string; gameCode: string; isReconnect: boolean }) => {
      setGameSession(data.gameId, data.playerId, data.gameCode);
      if (data.isReconnect) {
        toast({ title: "Welcome back!", description: "You've been reconnected to your game." });
      }
      navigate("/game");
    },
  });

  const canSubmit = playerName.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = () => {
    if (canSubmit) {
      joinMutation.mutate({ playerName: playerName.trim(), email: email.trim() });
    }
  };

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

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="max-w-sm mx-auto border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Enter Game</h3>
              <Input
                data-testid="player-name-input"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <Input
                data-testid="email-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              <Button
                data-testid="join-submit-btn"
                className="w-full"
                disabled={!canSubmit || joinMutation.isPending}
                onClick={handleSubmit}
              >
                {joinMutation.isPending ? "Joining..." : "Enter Game"}
              </Button>
              {joinMutation.isError && (
                <p className="text-sm text-destructive">{joinMutation.error.message}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
