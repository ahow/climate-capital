import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Home() {
  const [, navigate] = useLocation();
  const { gameId, playerId, setGameSession } = useGame();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  // If a session is already active (or just became active), go to /game.
  // Doing navigation in an effect rather than in onSuccess guarantees the
  // GameProvider state is committed before the /game page mounts, so the
  // GamePage's own redirect-if-no-session guard never fires.
  useEffect(() => {
    if (joined && gameId && playerId) {
      navigate("/game");
    }
  }, [joined, gameId, playerId, navigate]);

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
      setJoined(true);
    },
  });

  const canSubmit = playerName.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = () => {
    if (canSubmit) {
      joinMutation.mutate({ playerName: playerName.trim(), email: email.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#001E41] flex flex-col">
      {/* Navy hero */}
      <div className="bg-[#001E41] text-white">
        <div className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Schroders "lens" mark */}
            <svg width="28" height="28" viewBox="0 0 28 28" aria-label="Climate Capital">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#ffffff" strokeWidth="2" />
              <circle cx="14" cy="14" r="5" fill="#0074B7" />
            </svg>
            <span className="font-sans font-bold tracking-wide text-base">CLIMATE CAPITAL</span>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-white/70">Schroders</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl mx-auto"
        >
          <div className="text-center mb-10">
            <h1 className="font-sans font-bold tracking-tight text-[#001E41] text-4xl md:text-5xl">
              Climate Capital
            </h1>
            <div className="mx-auto mt-4 h-1 w-16 bg-[#0074B7]" aria-hidden />
            <p className="mt-6 text-[#494949] text-base">
              The climate investing simulation. Manage $100M across 8 rounds of real climate events.
            </p>
            <p className="mt-1 text-sm text-[#9AA8B4]">2015 &ndash; 2025</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-[#D9DFE7] rounded-xl p-8 shadow-sm"
          >
            <h3 className="font-sans font-semibold text-[#001E41] text-lg">Enter game</h3>
            <p className="text-sm text-[#494949] mt-1">Join an active session with your name and email.</p>
            <div className="mt-6 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#494949] mb-1.5 block">
                  Your name
                </label>
                <Input
                  data-testid="player-name-input"
                  placeholder="Jane Smith"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-white border-[#D9DFE7] text-[#001E41] focus-visible:ring-[#0074B7] focus-visible:border-[#0074B7]"
                />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[#494949] mb-1.5 block">
                  Email
                </label>
                <Input
                  data-testid="email-input"
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  className="bg-white border-[#D9DFE7] text-[#001E41] focus-visible:ring-[#0074B7] focus-visible:border-[#0074B7]"
                />
              </div>
              <Button
                data-testid="join-submit-btn"
                className="w-full bg-[#001E41] text-white hover:bg-[#0074B7] rounded-[10px] h-11 font-medium"
                disabled={!canSubmit || joinMutation.isPending}
                onClick={handleSubmit}
              >
                {joinMutation.isPending ? "Joining..." : "Enter Game"}
              </Button>
              {joinMutation.isError && (
                <p className="text-sm text-[#C4372C]">{joinMutation.error.message}</p>
              )}
            </div>
          </motion.div>

          <p className="text-center text-xs text-[#9AA8B4] mt-6">
            An educational simulation. Past performance is not a guide to future results.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
