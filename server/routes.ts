import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage, initStorage } from "./storage";
import {
  joinSchema,
  submitTradesSchema,
} from "@shared/schema";
import {
  GAME_ASSETS,
  STARTING_CASH,
  ROUND_BRIEFINGS,
  ROUND_TAKEAWAYS,
  PREDICTION_QUESTIONS,
  AWARDS,
  buildClosingScript,
} from "@shared/gameData";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { videoProvider } from "./heygen";

function computePortfolioValue(
  player: { portfolio: { cash: number; holdings: Array<{ assetId: string; units: number }> } },
  round: number,
): number {
  let total = player.portfolio.cash;
  for (const h of player.portfolio.holdings) {
    const asset = GAME_ASSETS.find((a) => a.id === h.assetId);
    if (!asset) continue;
    const idx = round - 1;
    const price =
      idx < 0
        ? asset.startPrice
        : idx >= asset.roundPrices.length
          ? asset.roundPrices[asset.roundPrices.length - 1]
          : asset.roundPrices[idx];
    total += h.units * price;
  }
  return total;
}

function calculateBenchmark(): number[] {
  const n = GAME_ASSETS.length; // 22
  let totalValue = STARTING_CASH; // $100M
  const history: number[] = [totalValue]; // round 0

  for (let round = 1; round <= 8; round++) {
    const perAsset = totalValue / n;
    let newTotal = 0;

    for (const asset of GAME_ASSETS) {
      const buyPrice = round === 1 ? asset.startPrice : asset.roundPrices[round - 2];
      const units = perAsset / buyPrice;
      const endPrice = asset.roundPrices[round - 1];
      newTotal += units * endPrice;
    }

    totalValue = newTotal;
    history.push(totalValue);
  }

  return history;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await initStorage();

  // ── Static data routes ──

  app.get("/api/assets", (_req: Request, res: Response) => {
    const sanitized = GAME_ASSETS.map(({ realBasis, ...rest }) => rest);
    res.json(sanitized);
  });

  app.get("/api/rounds/:round/briefing", (req: Request, res: Response) => {
    const round = parseInt(req.params.round as string, 10);
    const briefing = ROUND_BRIEFINGS.find((b) => b.round === round);
    if (!briefing) return res.status(404).json({ message: "Briefing not found" });
    return res.json(briefing);
  });

  app.get("/api/rounds/:round/takeaways", (req: Request, res: Response) => {
    const round = parseInt(req.params.round as string, 10);
    const takeaway = ROUND_TAKEAWAYS.find((t) => t.round === round);
    if (!takeaway) return res.status(404).json({ message: "Takeaways not found" });
    return res.json(takeaway);
  });

  app.get("/api/predictions/:round", (req: Request, res: Response) => {
    const round = parseInt(req.params.round as string, 10);
    const prediction = PREDICTION_QUESTIONS.find((p) => p.round === round);
    if (!prediction) return res.status(404).json({ message: "Prediction not found" });
    return res.json(prediction);
  });

  // ── Benchmark ──

  app.get("/api/benchmark", (_req: Request, res: Response) => {
    res.json(calculateBenchmark());
  });

  // ── Single join endpoint ──

  app.post("/api/join", async (req: Request, res: Response) => {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const { playerName, email } = parsed.data;

    try {
      const game = await storage.getOrCreateGame();

      // Check for reconnection by email
      const existing = await storage.findPlayerByEmail(game.id, email);
      if (existing) {
        return res.json({
          gameId: game.id,
          playerId: existing.id,
          gameCode: game.code,
          isReconnect: true,
        });
      }

      const player = await storage.joinGame(game.id, playerName, email);
      return res.status(201).json({
        gameId: game.id,
        playerId: player.id,
        gameCode: game.code,
        isReconnect: false,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Get current active game ──

  app.get("/api/game", async (_req: Request, res: Response) => {
    try {
      const game = await storage.getOrCreateGame();
      return res.json(game);
    } catch (err: any) {
      return res.status(404).json({ message: "No active game" });
    }
  });

  // ── Game routes ──

  app.get("/api/games/:code", async (req: Request, res: Response) => {
    const code = req.params.code as string;
    const isUuid = code.includes("-") && code.length > 10;
    const game = isUuid
      ? await storage.getGame(code)
      : await storage.getGameByCode(code);
    if (!game) return res.status(404).json({ message: "Game not found" });
    return res.json(game);
  });

  app.get("/api/games/:id", async (req: Request, res: Response) => {
    const game = await storage.getGame(req.params.id as string);
    if (!game) return res.status(404).json({ message: "Game not found" });
    return res.json(game);
  });

  app.get("/api/games/:id/player/:playerId", async (req: Request, res: Response) => {
    const player = await storage.getPlayer(
      req.params.id as string,
      req.params.playerId as string,
    );
    if (!player) return res.status(404).json({ message: "Player not found" });
    return res.json(player);
  });

  app.post(
    "/api/games/:id/player/:playerId/trades",
    async (req: Request, res: Response) => {
      const parsed = submitTradesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      try {
        const player = await storage.submitTrades(
          req.params.id as string,
          req.params.playerId as string,
          parsed.data.trades,
        );
        return res.json(player);
      } catch (err: any) {
        return res.status(400).json({ message: err.message });
      }
    },
  );

  // Per-player advance (advances only this player's round/phase)
  app.post(
    "/api/games/:id/player/:playerId/advance",
    async (req: Request, res: Response) => {
      try {
        const player = await storage.advancePlayer(
          req.params.id as string,
          req.params.playerId as string,
        );
        return res.json(player);
      } catch (err: any) {
        return res.status(404).json({ message: err.message });
      }
    },
  );

  // Per-player phase transition
  app.post(
    "/api/games/:id/player/:playerId/phase",
    async (req: Request, res: Response) => {
      const schema = z.object({
        phase: z.enum([
          "lobby",
          "howToPlay",
          "universe",
          "briefing",
          "research",
          "trading",
          "results",
          "takeaways",
          "finished",
        ]),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      try {
        const player = await storage.setPlayerPhase(
          req.params.id as string,
          req.params.playerId as string,
          parsed.data.phase,
        );
        return res.json(player);
      } catch (err: any) {
        return res.status(404).json({ message: err.message });
      }
    },
  );

  app.get("/api/games/:id/leaderboard", async (req: Request, res: Response) => {
    try {
      const leaderboard = await storage.getLeaderboard(req.params.id as string);
      return res.json(leaderboard);
    } catch (err: any) {
      return res.status(404).json({ message: err.message });
    }
  });

  app.get("/api/games/:id/awards", async (req: Request, res: Response) => {
    const game = await storage.getGame(req.params.id as string);
    if (!game) return res.status(404).json({ message: "Game not found" });
    if (game.status !== "finished") {
      return res
        .status(400)
        .json({ message: "Awards are only available when the game is finished" });
    }

    try {
      const awardResults = await storage.calculateAwards(req.params.id as string);
      const awardsArray = AWARDS.map((award) => {
        const result = awardResults[award.id];
        return {
          awardId: award.id,
          name: award.name,
          icon: award.icon,
          description: award.description,
          winnerId: result?.playerId ?? "",
          winnerName: result?.playerName ?? "\u2014",
        };
      });
      return res.json(awardsArray);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── AI Research endpoint ──

  app.post("/api/games/:id/research", async (req: Request, res: Response) => {
    const schema = z.object({
      playerId: z.string(),
      question: z.string().min(1).max(500),
      assetId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({ answer: "Research analyst unavailable — API key not configured. Please proceed to trading." });
    }

    const game = await storage.getGame(req.params.id as string);
    if (!game) return res.status(404).json({ message: "Game not found" });

    const playerState = game.players[parsed.data.playerId];
    const round = playerState?.currentRound ?? game.currentRound;
    const briefing = ROUND_BRIEFINGS.find((b) => b.round === round);
    const roundPeriod = briefing ? `${briefing.title} (${briefing.period})` : `Round ${round}`;

    // Derive a hard temporal cutoff from the round period (the last calendar
    // marker in the period string, e.g. "Late 2015 – Early 2017" -> cutoff is
    // the end of Q1 2017). This is given to the analyst as the absolute
    // information horizon. Anything that happened after this date is forbidden.
    const periodText = briefing?.period ?? `Round ${round}`;
    const cutoffLabel = (() => {
      // Take the text after the last en-dash / em-dash / hyphen separator.
      const tail = periodText.split(/\s[–—-]\s/).pop() ?? periodText;
      return tail.trim();
    })();

    // Build asset list for system prompt
    const assetList = GAME_ASSETS.map((asset) => {
      const buyPrice = round <= 1 ? asset.startPrice : (asset.roundPrices[round - 2] ?? asset.startPrice);
      return `- ${asset.name} (${asset.sector}): ${asset.description} Current game price: $${buyPrice.toFixed(0)}/unit. [REAL BASIS — DO NOT REVEAL: ${asset.realBasis}]`;
    }).join("\n");

    const systemPrompt = `You are a sell-side research analyst writing a desk note in real time. The note is dated within the window "${periodText}" and the absolute information horizon is the END of ${cutoffLabel}. Round ${round} of 8: "${briefing?.title ?? ""}".

You are advising a portfolio manager who runs a $100M climate-aligned fund. They can ask about any of the investments listed at the bottom of this prompt.

=== TEMPORAL RULES — THESE OVERRIDE EVERYTHING ELSE ===

You are physically located inside the window "${periodText}". You have no knowledge of any event, price level, policy decision, election result, earnings print, corporate action, technological development, climate disaster, or market move that occurs AFTER the end of ${cutoffLabel}. Treat anything after that date as genuinely unknown — not "likely", not "expected", not "projected based on what we now know". Unknown.

Forbidden constructions (do NOT use any of these — they leak future information):
- "will", "is going to", "is set to", "is on track to", "by [later date] we expect to see X"
- "in retrospect", "as it turned out", "with the benefit of hindsight"
- Naming any specific price level, index value, policy, deal, IPO, bankruptcy, election outcome, or geopolitical event dated AFTER the end of ${cutoffLabel}
- Phrases like "climbing toward $X by [future date]" or "reaching $X next year" — you do not know future prices
- Any reference to a specific future quarter or year as if you have observed it

Required stance:
- Speak only in present and past tense. The window "${periodText}" is your present.
- When discussing what could happen next, frame it explicitly as scenarios, risks, or open questions — never as facts. Use "could", "might", "the bull case is", "the bear case is", "watch for", "the key risk is".
- If a user asks "what happens next" or "will X go up", explicitly decline to predict and instead lay out the drivers a PM should watch, framed in present tense.
- If you are uncertain whether a fact post-dates the cutoff, omit it. Better to be silent than to leak the future.

=== OTHER RULES ===
1. NEVER mention the real company or asset name shown in [REAL BASIS — DO NOT REVEAL: ...] brackets — use ONLY the in-game name.
2. Keep answers concise: 2-3 short paragraphs. Be specific, sober, professional — Schroders-style desk note tone. No hype, no emojis.
3. Ground analysis in what a real analyst writing on the last day of ${cutoffLabel} would actually know.

Available investments (with current in-game prices as of ${cutoffLabel}):
${assetList}`;

    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const { question } = parsed.data;

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      });

      const answer = message.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("\n");

      return res.json({ answer });
    } catch (err: any) {
      console.error("Anthropic API error:", err.message);
      return res.status(500).json({ message: "Research analyst temporarily unavailable. Please try again or proceed to trading." });
    }
  });

  // ── Video briefing endpoints (cached per round) ──

  app.get("/api/videos/briefing/:round", async (req: Request, res: Response) => {
    const round = parseInt(req.params.round as string, 10);
    if (!Number.isFinite(round) || round < 1 || round > 8) {
      return res.status(400).json({ message: "Invalid round" });
    }

    if (!videoProvider.isEnabled()) {
      return res.json({ status: "disabled" });
    }

    try {
      const existing = await storage.getRoundBriefingVideo(round);
      if (existing) {
        if (existing.status === "completed" && existing.videoUrl) {
          return res.json({ status: "completed", videoUrl: existing.videoUrl });
        }
        if (existing.status === "failed") {
          return res.json({ status: "failed" });
        }
        return res.json({ status: existing.status });
      }

      const briefing = ROUND_BRIEFINGS.find((b) => b.round === round);
      const script = briefing?.videoScript;
      if (!script) {
        return res.json({ status: "disabled" });
      }

      await storage.createOrUpdateRoundBriefingVideo(round, { status: "pending" });

      try {
        const { videoId } = await videoProvider.generateVideo({
          script,
          callbackId: `briefing-round-${round}`,
        });
        await storage.createOrUpdateRoundBriefingVideo(round, {
          videoId,
          status: "processing",
        });
        return res.json({ status: "processing" });
      } catch (err: any) {
        console.error("HeyGen briefing generate error:", err.message);
        await storage.createOrUpdateRoundBriefingVideo(round, {
          status: "failed",
          failureMessage: err.message,
        });
        return res.json({ status: "failed" });
      }
    } catch (err: any) {
      console.error("briefing video error:", err.message);
      return res.json({ status: "failed" });
    }
  });

  app.post("/api/videos/closing/:playerId", async (req: Request, res: Response) => {
    const playerId = req.params.playerId as string;

    if (!videoProvider.isEnabled()) {
      return res.json({ status: "disabled" });
    }

    try {
      const allPlayers = await storage.getAllPlayers();
      const ref = allPlayers.find((p) => p.playerId === playerId);
      if (!ref) return res.status(404).json({ message: "Player not found" });

      const player = await storage.getPlayer(ref.gameId, playerId);
      if (!player) return res.status(404).json({ message: "Player not found" });

      const existing = await storage.getClosingVideo(playerId);
      if (existing) {
        if (existing.status === "completed" && existing.videoUrl) {
          return res.json({ status: "completed", videoUrl: existing.videoUrl });
        }
        if (existing.status === "failed") {
          return res.json({ status: "failed" });
        }
        return res.json({ status: existing.status });
      }

      const finalValue =
        player.valueHistory.length > 0
          ? player.valueHistory[player.valueHistory.length - 1]
          : computePortfolioValue(player, player.currentRound);

      const holdings = player.portfolio.holdings
        .map((h) => {
          const asset = GAME_ASSETS.find((a) => a.id === h.assetId);
          if (!asset) return null;
          const round = player.currentRound;
          const idx = round - 1;
          const price =
            idx < 0
              ? asset.startPrice
              : idx >= asset.roundPrices.length
                ? asset.roundPrices[asset.roundPrices.length - 1]
                : asset.roundPrices[idx];
          return { name: asset.name, value: h.units * price };
        })
        .filter((x): x is { name: string; value: number } => x !== null)
        .sort((a, b) => b.value - a.value);

      const script = buildClosingScript(player.name, finalValue, STARTING_CASH, holdings);

      await storage.createOrUpdateClosingVideo(playerId, { status: "pending" });

      try {
        const { videoId } = await videoProvider.generateVideo({
          script,
          callbackId: `closing-player-${playerId}`,
        });
        await storage.createOrUpdateClosingVideo(playerId, {
          videoId,
          status: "processing",
        });
        return res.json({ status: "processing" });
      } catch (err: any) {
        console.error("HeyGen closing generate error:", err.message);
        await storage.createOrUpdateClosingVideo(playerId, {
          status: "failed",
          failureMessage: err.message,
        });
        return res.json({ status: "failed" });
      }
    } catch (err: any) {
      console.error("closing video error:", err.message);
      return res.json({ status: "failed" });
    }
  });

  app.get("/api/videos/closing/:playerId", async (req: Request, res: Response) => {
    const playerId = req.params.playerId as string;
    if (!videoProvider.isEnabled()) {
      return res.json({ status: "disabled" });
    }
    try {
      const existing = await storage.getClosingVideo(playerId);
      if (!existing) return res.json({ status: "not_started" });
      if (existing.status === "completed" && existing.videoUrl) {
        return res.json({ status: "completed", videoUrl: existing.videoUrl });
      }
      return res.json({ status: existing.status });
    } catch (err: any) {
      return res.json({ status: "failed" });
    }
  });

  app.post("/api/webhooks/heygen", async (req: Request, res: Response) => {
    try {
      const secret = process.env.HEYGEN_WEBHOOK_SECRET;
      if (secret) {
        const signature =
          (req.headers["x-heygen-signature"] as string) ||
          (req.headers["heygen-signature"] as string) ||
          (req.headers["x-signature"] as string);
        const raw = (req as any).rawBody;
        if (signature && raw) {
          const computed = crypto
            .createHmac("sha256", secret)
            .update(raw)
            .digest("hex");
          // Permit "sha256=<hex>" or plain hex
          const provided = signature.replace(/^sha256=/, "");
          if (computed !== provided) {
            console.warn("HeyGen webhook signature mismatch");
            // Still return 200 to avoid retry storms; just don't process.
            return res.status(200).json({ ok: false, reason: "bad_signature" });
          }
        }
      }

      const body = req.body ?? {};
      const eventType: string | undefined = body.event_type ?? body.type;
      const data = body.data ?? body;
      const videoId: string | undefined = data?.video_id ?? body.video_id;
      const videoUrl: string | undefined = data?.video_url ?? body.video_url;
      const failureMessage: string | undefined =
        data?.failure_message ?? body.failure_message ?? body.error;

      if (!videoId) {
        return res.status(200).json({ ok: false, reason: "missing_video_id" });
      }

      const found = await storage.findVideoByVideoId(videoId);
      if (!found) {
        return res.status(200).json({ ok: false, reason: "video_not_tracked" });
      }

      const success =
        eventType === "avatar_video.success" ||
        (!eventType && !!videoUrl) ||
        eventType === "success";

      if (success && videoUrl) {
        if (found.kind === "briefing") {
          await storage.createOrUpdateRoundBriefingVideo(found.record.roundNumber, {
            status: "completed",
            videoUrl,
          });
        } else {
          await storage.createOrUpdateClosingVideo(found.record.playerId, {
            status: "completed",
            videoUrl,
          });
        }
      } else {
        if (found.kind === "briefing") {
          await storage.createOrUpdateRoundBriefingVideo(found.record.roundNumber, {
            status: "failed",
            failureMessage: failureMessage ?? "Unknown failure",
          });
        } else {
          await storage.createOrUpdateClosingVideo(found.record.playerId, {
            status: "failed",
            failureMessage: failureMessage ?? "Unknown failure",
          });
        }
      }

      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("heygen webhook error:", err.message);
      return res.status(200).json({ ok: false });
    }
  });

  // ── Admin endpoints ──

  const ADMIN_PASSWORD = "BeckhamIsBest";

  app.get("/api/admin/players", async (req: Request, res: Response) => {
    if (req.query.password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const allPlayers = await storage.getAllPlayers();
      return res.json({ players: allPlayers });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/players/:playerId", async (req: Request, res: Response) => {
    if (req.query.password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const playerId = req.params.playerId as string;
    try {
      // Find the player's gameId first
      const allPlayers = await storage.getAllPlayers();
      const playerRecord = allPlayers.find((p) => p.playerId === playerId);
      if (!playerRecord) {
        return res.status(404).json({ message: "Player not found" });
      }
      await storage.deletePlayer(playerRecord.gameId, playerId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── RESET SINGLE PLAYER (admin) ──
  app.post(
    "/api/admin/players/:playerId/reset",
    async (req: Request, res: Response) => {
      if (req.query.password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const playerId = req.params.playerId as string;
      try {
        const allPlayers = await storage.getAllPlayers();
        const playerRecord = allPlayers.find((p) => p.playerId === playerId);
        if (!playerRecord) {
          return res.status(404).json({ message: "Player not found" });
        }
        const player = await storage.resetPlayer(playerRecord.gameId, playerId);
        return res.json({ success: true, player });
      } catch (err: any) {
        return res.status(500).json({ message: err.message });
      }
    },
  );

  // Deprecated global reset — returns 410 Gone
  app.post("/api/admin/reset", (_req: Request, res: Response) => {
    return res.status(410).json({
      message:
        "Global reset has been removed. Reset individual players via /api/admin/players/:playerId/reset.",
    });
  });

  // ── ALL-TIME LEADERBOARD (public) ──
  app.get("/api/leaderboard", async (_req: Request, res: Response) => {
    try {
      const leaderboard = await storage.getAllTimeLeaderboard();
      const publicLeaderboard = leaderboard.map(({ email: _email, ...entry }) => entry);
      return res.json({ leaderboard: publicLeaderboard });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
