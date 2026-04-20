import { randomUUID } from "crypto";
import type {
  GameSession,
  PlayerState,
  Holding,
  Trade,
} from "@shared/schema";
import {
  GAME_ASSETS,
  STARTING_CASH,
  MAX_POSITION_PCT,
  AWARDS,
} from "@shared/gameData";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Price at the START of round N (used for trade execution)
function getBuyPrice(assetId: string, round: number): number {
  const asset = GAME_ASSETS.find((a) => a.id === assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);
  if (round <= 1) return asset.startPrice;
  const idx = round - 2;
  if (idx < 0 || idx >= asset.roundPrices.length) {
    return asset.roundPrices[asset.roundPrices.length - 1];
  }
  return asset.roundPrices[idx];
}

// Price at the END of round N (used for portfolio valuation and leaderboard)
function getEndPrice(assetId: string, round: number): number {
  const asset = GAME_ASSETS.find((a) => a.id === assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);
  if (round <= 0) return asset.startPrice;
  const idx = round - 1;
  if (idx >= asset.roundPrices.length) return asset.roundPrices[asset.roundPrices.length - 1];
  return asset.roundPrices[idx];
}

function portfolioValue(player: PlayerState, round: number): number {
  let total = player.portfolio.cash;
  for (const h of player.portfolio.holdings) {
    total += h.units * getEndPrice(h.assetId, round);
  }
  return total;
}

export interface IStorage {
  getOrCreateGame(): Promise<GameSession>;
  getGame(id: string): Promise<GameSession | undefined>;
  getGameByCode(code: string): Promise<GameSession | undefined>;
  joinGame(gameId: string, playerName: string, email: string): Promise<PlayerState>;
  findPlayerByEmail(gameId: string, email: string): Promise<PlayerState | undefined>;
  getPlayer(gameId: string, playerId: string): Promise<PlayerState | undefined>;
  submitTrades(gameId: string, playerId: string, trades: Trade[]): Promise<PlayerState>;
  advanceRound(gameId: string): Promise<GameSession>;
  setPhase(gameId: string, phase: GameSession["status"]): Promise<GameSession>;
  getLeaderboard(
    gameId: string,
  ): Promise<{ playerId: string; name: string; totalValue: number; rank: number }[]>;
  calculateAwards(
    gameId: string,
  ): Promise<Record<string, { playerId: string; playerName: string; value: number }>>;
  getAllPlayers(): Promise<Array<{ gameId: string; gameCode: string; gameStatus: string; playerId: string; name: string; email: string; currentRound: number }>>;
  deletePlayer(gameId: string, playerId: string): Promise<void>;
  getAllTimeLeaderboard(): Promise<Array<{
    rank: number;
    name: string;
    email: string;
    totalValue: number;
    gameCode: string;
    completedRound: number;
    date: string;
  }>>;
  resetCurrentGame(): Promise<void>;
}

export class MemStorage implements IStorage {
  private games: Map<string, GameSession> = new Map();

  async getOrCreateGame(): Promise<GameSession> {
    // Return first non-finished game, or create a new one
    for (const game of Array.from(this.games.values())) {
      if (game.status !== "finished") return game;
    }
    const id = randomUUID();
    let code = generateCode();
    while (Array.from(this.games.values()).some((g) => g.code === code)) {
      code = generateCode();
    }
    const game: GameSession = {
      id,
      code,
      status: "lobby",
      currentRound: 1,
      maxRounds: 8,
      players: {},
      createdAt: Date.now(),
      phaseDeadline: null,
    };
    this.games.set(id, game);
    return game;
  }

  async getGame(id: string): Promise<GameSession | undefined> {
    return this.games.get(id);
  }

  async getGameByCode(code: string): Promise<GameSession | undefined> {
    return Array.from(this.games.values()).find(
      (g) => g.code === code.toUpperCase(),
    );
  }

  async findPlayerByEmail(gameId: string, email: string): Promise<PlayerState | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    return Object.values(game.players).find((p) => p.email === email);
  }

  async joinGame(gameId: string, playerName: string, email: string): Promise<PlayerState> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    const id = randomUUID();
    const player: PlayerState = {
      id,
      name: playerName,
      email,
      currentRound: game.currentRound,
      portfolio: {
        cash: STARTING_CASH,
        holdings: [],
      },
      valueHistory: [],
      predictions: [],
    };
    game.players[id] = player;
    return player;
  }

  async getPlayer(gameId: string, playerId: string): Promise<PlayerState | undefined> {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    return game.players[playerId];
  }

  async submitTrades(gameId: string, playerId: string, trades: Trade[]): Promise<PlayerState> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    const player = game.players[playerId];
    if (!player) throw new Error("Player not found");

    const round = game.currentRound;

    for (const trade of trades) {
      const asset = GAME_ASSETS.find((a) => a.id === trade.assetId);
      if (!asset) throw new Error(`Unknown asset: ${trade.assetId}`);

      const currentPrice = getBuyPrice(trade.assetId, round);

      if (trade.action === "buy") {
        if (trade.amount > player.portfolio.cash) {
          throw new Error(
            `Insufficient cash: have $${player.portfolio.cash}, need $${trade.amount}`,
          );
        }

        const totalValue = portfolioValue(player, round);
        const existingHolding = player.portfolio.holdings.find(
          (h) => h.assetId === trade.assetId,
        );
        const existingValue = existingHolding
          ? existingHolding.units * currentPrice
          : 0;
        const newPositionValue = existingValue + trade.amount;
        if (newPositionValue > totalValue * MAX_POSITION_PCT) {
          throw new Error(
            `Position limit exceeded: ${trade.assetId} would be ${((newPositionValue / totalValue) * 100).toFixed(1)}% of portfolio (max ${MAX_POSITION_PCT * 100}%)`,
          );
        }

        const units = trade.amount / currentPrice;
        player.portfolio.cash -= trade.amount;

        if (existingHolding) {
          existingHolding.units += units;
        } else {
          const holding: Holding = {
            assetId: trade.assetId,
            units,
            purchaseRound: round,
            lockedUntilRound: round + asset.lockRounds,
          };
          player.portfolio.holdings.push(holding);
        }
      } else {
        const holding = player.portfolio.holdings.find(
          (h) => h.assetId === trade.assetId,
        );
        if (!holding) {
          throw new Error(`No holding for asset: ${trade.assetId}`);
        }

        if (round < holding.lockedUntilRound) {
          throw new Error(
            `Asset ${trade.assetId} is locked until round ${holding.lockedUntilRound}`,
          );
        }

        const unitsToSell = trade.amount / currentPrice;
        if (unitsToSell > holding.units + 0.0001) {
          throw new Error(
            `Insufficient units: have ${holding.units}, trying to sell ${unitsToSell}`,
          );
        }

        const actualUnits = Math.min(unitsToSell, holding.units);
        player.portfolio.cash += actualUnits * currentPrice;
        holding.units -= actualUnits;

        if (holding.units < 0.0001) {
          player.portfolio.holdings = player.portfolio.holdings.filter(
            (h) => h.assetId !== trade.assetId,
          );
        }
      }
    }

    return player;
  }

  async advanceRound(gameId: string): Promise<GameSession> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    for (const player of Object.values(game.players)) {
      const value = portfolioValue(player, game.currentRound);
      player.valueHistory.push(value);
    }

    game.currentRound += 1;

    for (const player of Object.values(game.players)) {
      player.currentRound = game.currentRound;
    }

    if (game.currentRound > game.maxRounds) {
      game.status = "finished";
    } else {
      game.status = "briefing";
    }

    return game;
  }

  async setPhase(gameId: string, phase: GameSession["status"]): Promise<GameSession> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    game.status = phase;
    return game;
  }

  async getLeaderboard(
    gameId: string,
  ): Promise<{ playerId: string; name: string; totalValue: number; rank: number }[]> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    const entries = Object.values(game.players).map((player) => ({
      playerId: player.id,
      name: player.name,
      totalValue: portfolioValue(player, game.currentRound),
    }));

    entries.sort((a, b) => b.totalValue - a.totalValue);

    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async calculateAwards(
    gameId: string,
  ): Promise<Record<string, { playerId: string; playerName: string; value: number }>> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    const players = Object.values(game.players);
    if (players.length === 0) return {};

    const round = game.currentRound;
    const awards: Record<
      string,
      { playerId: string; playerName: string; value: number }
    > = {};

    const totalVal = (p: PlayerState) => portfolioValue(p, round);

    const champion = players.reduce((best, p) =>
      totalVal(p) > totalVal(best) ? p : best,
    );
    awards["champion"] = {
      playerId: champion.id,
      playerName: champion.name,
      value: totalVal(champion),
    };

    const alpha = players.reduce((best, p) =>
      totalVal(p) > totalVal(best) ? p : best,
    );
    awards["alpha"] = {
      playerId: alpha.id,
      playerName: alpha.name,
      value: totalVal(alpha) - STARTING_CASH,
    };

    const fossilIds = new Set(["titan", "appcoal"]);
    const fossilReturn = (p: PlayerState) => {
      return p.portfolio.holdings
        .filter((h) => fossilIds.has(h.assetId))
        .reduce((sum, h) => sum + h.units * getEndPrice(h.assetId, round), 0);
    };
    const baron = players.reduce((best, p) =>
      fossilReturn(p) > fossilReturn(best) ? p : best,
    );
    awards["baron"] = {
      playerId: baron.id,
      playerName: baron.name,
      value: fossilReturn(baron),
    };

    let worstLoss = 0;
    let strandedPlayer = players[0];
    for (const p of players) {
      for (const h of p.portfolio.holdings) {
        const asset = GAME_ASSETS.find((a) => a.id === h.assetId)!;
        const purchasePrice =
          h.purchaseRound <= 1
            ? asset.startPrice
            : getBuyPrice(h.assetId, h.purchaseRound);
        const currentPriceVal = getEndPrice(h.assetId, round);
        const loss = h.units * (purchasePrice - currentPriceVal);
        if (loss > worstLoss) {
          worstLoss = loss;
          strandedPlayer = p;
        }
      }
    }
    awards["stranded"] = {
      playerId: strandedPlayer.id,
      playerName: strandedPlayer.name,
      value: worstLoss,
    };

    let bestSteady = players[0];
    let bestSteadyScore = -Infinity;
    for (const p of players) {
      const ret = totalVal(p) - STARTING_CASH;
      if (ret <= 0 || p.valueHistory.length < 2) continue;
      const mean =
        p.valueHistory.reduce((s, v) => s + v, 0) / p.valueHistory.length;
      const variance =
        p.valueHistory.reduce((s, v) => s + (v - mean) ** 2, 0) /
        p.valueHistory.length;
      const stddev = Math.sqrt(variance);
      const score = stddev > 0 ? ret / stddev : ret;
      if (score > bestSteadyScore) {
        bestSteadyScore = score;
        bestSteady = p;
      }
    }
    awards["steady"] = {
      playerId: bestSteady.id,
      playerName: bestSteady.name,
      value: bestSteadyScore === -Infinity ? 0 : bestSteadyScore,
    };

    const goodCarbonIds = new Set(["eucarbon", "vcm-premium"]);
    const carbonReturn = (p: PlayerState) => {
      return p.portfolio.holdings
        .filter((h) => goodCarbonIds.has(h.assetId))
        .reduce((sum, h) => sum + h.units * getEndPrice(h.assetId, round), 0);
    };
    const greenwash = players.reduce((best, p) =>
      carbonReturn(p) > carbonReturn(best) ? p : best,
    );
    awards["greenwash"] = {
      playerId: greenwash.id,
      playerName: greenwash.name,
      value: carbonReturn(greenwash),
    };

    let bestContrarian = players[0];
    let bestContrarianReturn = 0;
    for (const p of players) {
      let contReturn = 0;
      for (const h of p.portfolio.holdings) {
        const asset = GAME_ASSETS.find((a) => a.id === h.assetId)!;
        let peak = asset.startPrice;
        for (let r = 1; r <= h.purchaseRound; r++) {
          const price = getBuyPrice(h.assetId, r);
          if (price > peak) peak = price;
        }
        const purchasePrice = getBuyPrice(h.assetId, h.purchaseRound);
        if (purchasePrice <= peak * 0.8) {
          const currentPriceVal = getEndPrice(h.assetId, round);
          contReturn += h.units * (currentPriceVal - purchasePrice);
        }
      }
      if (contReturn > bestContrarianReturn) {
        bestContrarianReturn = contReturn;
        bestContrarian = p;
      }
    }
    awards["contrarian"] = {
      playerId: bestContrarian.id,
      playerName: bestContrarian.name,
      value: bestContrarianReturn,
    };

    return awards;
  }

  async getAllPlayers(): Promise<Array<{ gameId: string; gameCode: string; gameStatus: string; playerId: string; name: string; email: string; currentRound: number }>> {
    const result: Array<{ gameId: string; gameCode: string; gameStatus: string; playerId: string; name: string; email: string; currentRound: number }> = [];
    for (const game of Array.from(this.games.values())) {
      for (const player of Object.values(game.players)) {
        result.push({
          gameId: game.id,
          gameCode: game.code,
          gameStatus: game.status,
          playerId: player.id,
          name: player.name,
          email: player.email,
          currentRound: player.currentRound,
        });
      }
    }
    return result;
  }

  async deletePlayer(gameId: string, playerId: string): Promise<void> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    delete game.players[playerId];
  }

  async getAllTimeLeaderboard(): Promise<Array<{
    rank: number;
    name: string;
    email: string;
    totalValue: number;
    gameCode: string;
    completedRound: number;
    date: string;
  }>> {
    const entries: Array<{
      name: string;
      email: string;
      totalValue: number;
      gameCode: string;
      completedRound: number;
      date: string;
    }> = [];

    for (const game of Array.from(this.games.values())) {
      const round = game.currentRound;
      for (const player of Object.values(game.players)) {
        entries.push({
          name: player.name,
          email: player.email,
          totalValue: portfolioValue(player, round),
          gameCode: game.code,
          completedRound: round,
          date: new Date().toISOString(),
        });
      }
    }

    entries.sort((a, b) => b.totalValue - a.totalValue);
    return entries.slice(0, 50).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async resetCurrentGame(): Promise<void> {
    for (const game of Array.from(this.games.values())) {
      if (game.status !== "finished") {
        game.status = "finished";
      }
    }
  }
}

// Conditionally export DbStorage or MemStorage
let storage: IStorage = new MemStorage();

export async function initStorage(): Promise<void> {
  if (process.env.DATABASE_URL) {
    // Create tables if they don't exist
    const pg = await import("pg");
    const pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(8) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'lobby',
        current_round INTEGER NOT NULL DEFAULT 1,
        max_rounds INTEGER NOT NULL DEFAULT 8,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        phase_deadline TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id UUID NOT NULL REFERENCES games(id),
        name VARCHAR(30) NOT NULL,
        email VARCHAR(255) NOT NULL,
        current_round INTEGER NOT NULL DEFAULT 1,
        portfolio JSONB NOT NULL,
        value_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        predictions JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);
    await pool.end();

    const { DbStorage } = await import("./dbStorage");
    storage = new DbStorage();
    console.log("Using PostgreSQL storage");
  } else {
    console.log("No DATABASE_URL set, using in-memory storage");
  }
}

export { storage };
