import { useEffect, useId, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  LineChart,
  LockKeyhole,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const JOURNEY = [
  { icon: BookOpenText, title: "Briefing", copy: "Read the market signals shaping the round." },
  { icon: Search, title: "Research", copy: "Compare assets, evidence, and risks." },
  { icon: BarChart3, title: "Allocate", copy: "Build a proposed portfolio with live cash feedback." },
  { icon: ClipboardCheck, title: "Review", copy: "Check every holding before you commit." },
  { icon: LineChart, title: "Results", copy: "Understand what changed and why." },
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function Home() {
  const [, navigate] = useLocation();
  const { gameId, playerId, setGameSession } = useGame();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const emailHelpId = useId();
  const emailErrorId = useId();
  const formErrorId = useId();

  useEffect(() => {
    if (joined && gameId && playerId) navigate("/game");
  }, [joined, gameId, playerId, navigate]);

  const joinMutation = useMutation({
    mutationFn: async ({ playerName, email }: { playerName: string; email: string }) => {
      const res = await apiRequest("POST", "/api/join", { playerName, email });
      return res.json();
    },
    onSuccess: (data: { gameId: string; playerId: string; gameCode: string; isReconnect: boolean }) => {
      setGameSession(data.gameId, data.playerId, data.gameCode);
      if (data.isReconnect) {
        toast({ title: "Welcome back", description: "We restored your existing simulation session." });
      }
      setJoined(true);
    },
  });

  const trimmedName = playerName.trim();
  const trimmedEmail = email.trim();
  const emailValid = trimmedEmail.length > 0 && isValidEmail(trimmedEmail);
  const canSubmit = trimmedName.length > 0 && emailValid;
  const hasSavedSession = Boolean(gameId && playerId);
  const emailError = attempted && trimmedEmail.length > 0 && !emailValid;

  const submitLabel = useMemo(() => {
    if (joinMutation.isPending) return "Starting your session…";
    return "Start the simulation";
  }, [joinMutation.isPending]);

  function handleSubmit() {
    setAttempted(true);
    if (!canSubmit) return;
    joinMutation.mutate({ playerName: trimmedName, email: trimmedEmail });
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#001E41]">
      <header className="border-b border-white/10 bg-[#001E41] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-label="Climate Capital">
              <circle cx="14" cy="14" r="12" fill="none" stroke="#ffffff" strokeWidth="2" />
              <circle cx="14" cy="14" r="5" fill="#39A9E0" />
            </svg>
            <span className="text-sm font-bold tracking-[0.12em]">CLIMATE CAPITAL</span>
          </div>
          <div className="flex items-center gap-5">
            <a className="text-xs text-white/70 underline-offset-4 hover:text-white hover:underline" href="#privacy">
              Privacy
            </a>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/60">Schroders</span>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#001E41] text-white">
          <div className="absolute inset-0 opacity-30" aria-hidden>
            <div className="absolute -left-40 top-10 h-80 w-80 rounded-full border border-[#39A9E0]/40" />
            <div className="absolute -left-24 top-24 h-52 w-52 rounded-full border border-[#39A9E0]/30" />
            <div className="absolute right-[-8rem] top-[-9rem] h-96 w-96 rounded-full bg-[#0074B7]/20 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-20 lg:pt-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#A8D0E6]">
                Climate investing simulation · 2015–2025
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-[3.6rem]">
                Navigate a decade of climate investing
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/78 sm:text-lg">
                Manage <strong className="font-semibold text-white">$100 million</strong> through eight rounds of real-world climate events. Research the market, build a portfolio, and see how each decision changes your result.
              </p>

              <dl className="mt-8 grid max-w-2xl grid-cols-3 divide-x divide-white/15 rounded-xl border border-white/15 bg-white/[0.06] py-4 backdrop-blur">
                <div className="px-4">
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-white/55">Starting capital</dt>
                  <dd className="mt-1 font-mono text-xl font-semibold text-white sm:text-2xl">$100M</dd>
                </div>
                <div className="px-4">
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-white/55">Decision rounds</dt>
                  <dd className="mt-1 font-mono text-xl font-semibold text-white sm:text-2xl">8</dd>
                </div>
                <div className="px-4">
                  <dt className="text-[10px] uppercase tracking-[0.16em] text-white/55">Historical period</dt>
                  <dd className="mt-1 font-mono text-base font-semibold text-white sm:text-xl">2015–25</dd>
                </div>
              </dl>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45 }}
              className="rounded-2xl border border-white/15 bg-white p-6 text-[#001E41] shadow-2xl shadow-black/20 sm:p-7"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0074B7]">Your session</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em]">Start making decisions</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#647487]">
                Enter a display name and email. If you have played before, the same details reconnect you to your session.
              </p>

              {hasSavedSession && (
                <div className="mt-5 rounded-xl border border-[#0074B7]/25 bg-[#EAF5FB] p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0074B7]" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">A saved session is available in this browser.</p>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate("/game")}
                        className="mt-1 h-auto border-0 p-0 text-[#0074B7] hover:bg-transparent hover:text-[#001E41]"
                      >
                        Resume saved session <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor={nameId} className="block text-sm font-semibold text-[#001E41]">
                    Display name
                  </label>
                  <Input
                    id={nameId}
                    data-testid="player-name-input"
                    autoComplete="name"
                    placeholder="Jane Smith"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    aria-invalid={attempted && trimmedName.length === 0}
                    className="mt-1.5 h-11 bg-white border-[#C9D2DD] text-[#001E41] focus-visible:ring-[#0074B7]"
                  />
                  <p className="mt-1.5 text-xs text-[#647487]">This name may appear on the public leaderboard.</p>
                </div>

                <div>
                  <label htmlFor={emailId} className="block text-sm font-semibold text-[#001E41]">
                    Email for session recovery
                  </label>
                  <Input
                    id={emailId}
                    data-testid="email-input"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={() => setAttempted(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSubmit();
                    }}
                    aria-invalid={emailError}
                    aria-describedby={`${emailHelpId}${emailError ? ` ${emailErrorId}` : ""}`}
                    className="mt-1.5 h-11 bg-white border-[#C9D2DD] text-[#001E41] focus-visible:ring-[#0074B7]"
                  />
                  <p id={emailHelpId} className="mt-1.5 text-xs text-[#647487]">
                    Used only to reconnect you. Your email is never shown on the public leaderboard.
                  </p>
                  {emailError && (
                    <p id={emailErrorId} className="mt-1.5 text-xs font-medium text-[#C4372C]">
                      Enter a valid email address, such as name@example.com.
                    </p>
                  )}
                </div>

                <div id="privacy" className="rounded-lg border border-[#D9DFE7] bg-[#F7F9FB] p-3 text-xs leading-relaxed text-[#566779]">
                  <LockKeyhole className="mr-1.5 inline h-3.5 w-3.5 text-[#0074B7]" aria-hidden />
                  Your display name, score, completed round, and game code may appear on the public leaderboard. Your email is not published.
                </div>

                <Button
                  data-testid="join-submit-btn"
                  className="h-12 w-full rounded-[10px] bg-[#001E41] text-base font-semibold text-white hover:bg-[#0074B7]"
                  disabled={!canSubmit || joinMutation.isPending}
                  onClick={handleSubmit}
                >
                  {submitLabel}
                  {!joinMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                {joinMutation.isError && (
                  <p id={formErrorId} role="alert" className="rounded-lg border border-[#C4372C]/25 bg-[#FBE4E1] p-3 text-sm text-[#A42E25]">
                    We couldn’t start your session. Your details have been kept; check your connection and try again.
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 lg:py-14" aria-labelledby="journey-heading">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0074B7]">One repeatable round</p>
            <h2 id="journey-heading" className="mt-2 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
              The interface guides every decision
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#647487]">
              Each round follows the same five steps, so you always know where you are and what happens next.
            </p>
          </div>

          <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {JOURNEY.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative rounded-xl border border-[#D9DFE7] bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF5FB] text-[#0074B7]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="font-mono text-xs text-[#7B8998]">0{index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#647487]">{step.copy}</p>
                </li>
              );
            })}
          </ol>

          <p className="mt-8 text-center text-xs text-[#7B8998]">
            An educational simulation. Past performance is not a guide to future results.
          </p>
        </section>
      </main>
    </div>
  );
}
