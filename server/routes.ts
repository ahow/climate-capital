import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import {
  createGameSchema,
  submitTradesSchema,
} from "@shared/schema";
import {
  GAME_ASSETS,
  ROUND_BRIEFINGS,
  ROUND_TAKEAWAYS,
  PREDICTION_QUESTIONS,
  AWARDS,
} from "@shared/gameData";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
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

  // ── Game routes ──

  app.post("/api/games", (req: Request, res: Response) => {
    const parsed = createGameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const { hostName, maxRounds, mode } = parsed.data;
    const game = storage.createGame(hostName, maxRounds, mode);
    // Auto-join the host as a player
    const hostPlayer = storage.joinGame(game.id, hostName);
    return res.status(201).json({ ...game, hostPlayerId: hostPlayer.id });
  });

  app.get("/api/games/:code", (req: Request, res: Response) => {
    const code = req.params.code as string;
    // If it looks like a UUID, get by ID; otherwise get by code
    const isUuid = code.includes("-") && code.length > 10;
    const game = isUuid ? storage.getGame(code) : storage.getGameByCode(code);
    if (!game) return res.status(404).json({ message: "Game not found" });
    return res.json(game);
  });

  app.post("/api/games/:id/join", (req: Request, res: Response) => {
    const id = req.params.id as string;
    const schema = z.object({ playerName: z.string().min(1).max(30) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    // id might be a game code or a UUID — resolve to a game
    const isUuid = id.includes("-") && id.length > 10;
    const game = isUuid ? storage.getGame(id) : storage.getGameByCode(id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    try {
      const player = storage.joinGame(game.id, parsed.data.playerName);
      return res.status(201).json({ ...player, gameId: game.id, gameCode: game.code });
    } catch (err: any) {
      return res.status(404).json({ message: err.message });
    }
  });

  app.get("/api/games/:id", (req: Request, res: Response) => {
    const game = storage.getGame(req.params.id as string);
    if (!game) return res.status(404).json({ message: "Game not found" });
    return res.json(game);
  });

  app.get("/api/games/:id/player/:playerId", (req: Request, res: Response) => {
    const player = storage.getPlayer(
      req.params.id as string,
      req.params.playerId as string,
    );
    if (!player) return res.status(404).json({ message: "Player not found" });
    return res.json(player);
  });

  app.post(
    "/api/games/:id/player/:playerId/trades",
    (req: Request, res: Response) => {
      const parsed = submitTradesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      try {
        const player = storage.submitTrades(
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

  app.post("/api/games/:id/advance", (req: Request, res: Response) => {
    try {
      const game = storage.advanceRound(req.params.id as string);
      return res.json(game);
    } catch (err: any) {
      return res.status(404).json({ message: err.message });
    }
  });

  app.post("/api/games/:id/phase", (req: Request, res: Response) => {
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
      const game = storage.setPhase(
        req.params.id as string,
        parsed.data.phase,
      );
      return res.json(game);
    } catch (err: any) {
      return res.status(404).json({ message: err.message });
    }
  });

  app.get("/api/games/:id/leaderboard", (req: Request, res: Response) => {
    try {
      const leaderboard = storage.getLeaderboard(req.params.id as string);
      return res.json(leaderboard);
    } catch (err: any) {
      return res.status(404).json({ message: err.message });
    }
  });

  app.get("/api/games/:id/awards", (req: Request, res: Response) => {
    const game = storage.getGame(req.params.id as string);
    if (!game) return res.status(404).json({ message: "Game not found" });
    if (game.status !== "finished") {
      return res
        .status(400)
        .json({ message: "Awards are only available when the game is finished" });
    }

    try {
      const awardResults = storage.calculateAwards(req.params.id as string);
      // Transform into the array format the frontend expects
      const awardsArray = AWARDS.map((award) => {
        const result = awardResults[award.id];
        return {
          awardId: award.id,
          name: award.name,
          icon: award.icon,
          description: award.description,
          winnerId: result?.playerId ?? "",
          winnerName: result?.playerName ?? "—",
        };
      });
      return res.json(awardsArray);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
