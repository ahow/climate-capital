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
} from "@shared/gameData";
import { z } from "zod";

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
    res.json(GAME_ASSETS);
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

  app.post("/api/games/:id/advance", async (req: Request, res: Response) => {
    try {
      const game = await storage.advanceRound(req.params.id as string);
      return res.json(game);
    } catch (err: any) {
      return res.status(404).json({ message: err.message });
    }
  });

  app.post("/api/games/:id/phase", async (req: Request, res: Response) => {
    const schema = z.object({
      phase: z.enum([
        "lobby",
        "briefing",
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
      const game = await storage.setPhase(
        req.params.id as string,
        parsed.data.phase,
      );
      return res.json(game);
    } catch (err: any) {
      return res.status(404).json({ message: err.message });
    }
  });

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

  return httpServer;
}
