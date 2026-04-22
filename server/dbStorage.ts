import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import pg from "pg";
import { games, players } from "@shared/dbSchema";
import type { IStorage } from "./storage";
import type {
  GameSession,
  PlayerState,
  PlayerPhase,
  Trade,
  Holding,
} from "@shared/schema";
import {
  GAME_ASSETS,
  STARTING_CASH,
  MAX_POSITION_PCT,
} from "@shared/gameData";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool);

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

function rowToPlayer(row: typeof players.$inferSelect): PlayerState {
  const rawPhase = ((row as any).phase ?? "briefing") as PlayerPhase;
  // Legacy rows saved with phase "lobby" should be treated as "briefing"
  const phase: PlayerPhase = rawPhase === "lobby" ? "briefing" : rawPhase;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    currentRound: row.currentRound,
    phase,
    portfolio: row.portfolio as PlayerState["portfolio"],
    valueHistory: (row.valueHistory ?? []) as number[],
    predictions: (row.predictions ?? []) as PlayerState["predictions"],
  };
}

async function buildGameSession(
  gameRow: typeof games.$inferSelect,
): Promise<GameSession> {
  const playerRows = await db
    .select()
    .from(players)
    .where(eq(players.gameId, gameRow.id));

  const playersMap: Record<string, PlayerState> = {};
  for (const row of playerRows) {
    const p = rowToPlayer(row);
    playersMap[p.id] = p;
  }

  return {
    id: gameRow.id,
    code: gameRow.code,
    status: gameRow.status as GameSession["status"],
    currentRound: gameRow.currentRound,
    maxRounds: gameRow.maxRounds,
    players: playersMap,
    createdAt: gameRow.createdAt.getTime(),
    phaseDeadline: gameRow.phaseDeadline?.getTime() ?? null,
  };
}

export class DbStorage implements IStorage {
  async getOrCreateGame(): Promise<GameSession> {
    // Find first non-finished game
    const rows = await db
      .select()
      .from(games)
      .where(eq(games.status, "lobby"))
      .limit(1);

    if (rows.length === 0) {
      // Also check for in-progress games
      const allGames = await db.select().from(games);
      const activeGame = allGames.find((g) => g.status !== "finished");
      if (activeGame) return buildGameSession(activeGame);

      // Create new game
      const code = generateCode();
      const [newGame] = await db
        .insert(games)
        .values({ code, status: "lobby", currentRound: 1, maxRounds: 8 })
        .returning();
      return buildGameSession(newGame);
    }

    return buildGameSession(rows[0]);
  }

  async getGame(id: string): Promise<GameSession | undefined> {
    const rows = await db.select().from(games).where(eq(games.id, id)).limit(1);
    if (rows.length === 0) return undefined;
    return buildGameSession(rows[0]);
  }

  async getGameByCode(code: string): Promise<GameSession | undefined> {
    const rows = await db
      .select()
      .from(games)
      .where(eq(games.code, code.toUpperCase()))
      .limit(1);
    if (rows.length === 0) return undefined;
    return buildGameSession(rows[0]);
  }

  async findPlayerByEmail(
    gameId: string,
    email: string,
  ): Promise<PlayerState | undefined> {
    const rows = await db
      .select()
      .from(players)
      .where(and(eq(players.gameId, gameId), eq(players.email, email)))
      .limit(1);
    if (rows.length === 0) return undefined;
    return rowToPlayer(rows[0]);
  }

  async joinGame(
    gameId: string,
    playerName: string,
    email: string,
  ): Promise<PlayerState> {
    const gameRows = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    if (gameRows.length === 0) throw new Error("Game not found");
    const game = gameRows[0];

    const [row] = await db
      .insert(players)
      .values({
        gameId,
        name: playerName,
        email,
        currentRound: 1,
        phase: "briefing",
        portfolio: { cash: STARTING_CASH, holdings: [] },
        valueHistory: [],
        predictions: [],
      })
      .returning();

    return rowToPlayer(row);
  }

  async getPlayer(
    gameId: string,
    playerId: string,
  ): Promise<PlayerState | undefined> {
    const rows = await db
      .select()
      .from(players)
      .where(and(eq(players.gameId, gameId), eq(players.id, playerId)))
      .limit(1);
    if (rows.length === 0) return undefined;
    return rowToPlayer(rows[0]);
  }

  async submitTrades(
    gameId: string,
    playerId: string,
    trades: Trade[],
  ): Promise<PlayerState> {
    const game = await this.getGame(gameId);
    if (!game) throw new Error("Game not found");
    const player = game.players[playerId];
    if (!player) throw new Error("Player not found");

    const round = player.currentRound;

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
        if (!holding) throw new Error(`No holding for asset: ${trade.assetId}`);

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

    // Persist updated player
    await db
      .update(players)
      .set({
        portfolio: player.portfolio,
      })
      .where(eq(players.id, playerId));

    return player;
  }

  async advancePlayer(gameId: string, playerId: string): Promise<PlayerState> {
    const player = await this.getPlayer(gameId, playerId);
    if (!player) throw new Error("Player not found");

    const game = await this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const value = portfolioValue(player, player.currentRound);
    player.valueHistory.push(value);
    player.currentRound += 1;
    player.phase =
      player.currentRound > game.maxRounds ? "finished" : "briefing";

    await db
      .update(players)
      .set({
        valueHistory: player.valueHistory,
        currentRound: player.currentRound,
        phase: player.phase,
      })
      .where(eq(players.id, player.id));

    return player;
  }

  async setPlayerPhase(
    gameId: string,
    playerId: string,
    phase: PlayerPhase,
  ): Promise<PlayerState> {
    await db
      .update(players)
      .set({ phase })
      .where(and(eq(players.gameId, gameId), eq(players.id, playerId)));

    const player = await this.getPlayer(gameId, playerId);
    if (!player) throw new Error("Player not found");
    return player;
  }

  async resetPlayer(gameId: string, playerId: string): Promise<PlayerState> {
    await db
      .update(players)
      .set({
        currentRound: 1,
        phase: "briefing",
        portfolio: { cash: STARTING_CASH, holdings: [] },
        valueHistory: [],
        predictions: [],
      })
      .where(and(eq(players.gameId, gameId), eq(players.id, playerId)));

    const player = await this.getPlayer(gameId, playerId);
    if (!player) throw new Error("Player not found");
    return player;
  }

  async getLeaderboard(
    gameId: string,
  ): Promise<
    { playerId: string; name: string; totalValue: number; rank: number }[]
  > {
    const game = await this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const entries = Object.values(game.players).map((player) => ({
      playerId: player.id,
      name: player.name,
      totalValue: portfolioValue(player, player.currentRound),
    }));

    entries.sort((a, b) => b.totalValue - a.totalValue);
    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async calculateAwards(
    gameId: string,
  ): Promise<
    Record<string, { playerId: string; playerName: string; value: number }>
  > {
    const game = await this.getGame(gameId);
    if (!game) throw new Error("Game not found");

    const playersList = Object.values(game.players);
    if (playersList.length === 0) return {};

    const awards: Record<
      string,
      { playerId: string; playerName: string; value: number }
    > = {};

    const totalVal = (p: PlayerState) => portfolioValue(p, p.currentRound);

    const champion = playersList.reduce((best, p) =>
      totalVal(p) > totalVal(best) ? p : best,
    );
    awards["champion"] = {
      playerId: champion.id,
      playerName: champion.name,
      value: totalVal(champion),
    };

    const alpha = playersList.reduce((best, p) =>
      totalVal(p) > totalVal(best) ? p : best,
    );
    awards["alpha"] = {
      playerId: alpha.id,
      playerName: alpha.name,
      value: totalVal(alpha) - STARTING_CASH,
    };

    const fossilIds = new Set(["titan", "appcoal"]);
    const fossilReturn = (p: PlayerState) =>
      p.portfolio.holdings
        .filter((h) => fossilIds.has(h.assetId))
        .reduce(
          (sum, h) => sum + h.units * getEndPrice(h.assetId, p.currentRound),
          0,
        );
    const baron = playersList.reduce((best, p) =>
      fossilReturn(p) > fossilReturn(best) ? p : best,
    );
    awards["baron"] = {
      playerId: baron.id,
      playerName: baron.name,
      value: fossilReturn(baron),
    };

    let worstLoss = 0;
    let strandedPlayer = playersList[0];
    for (const p of playersList) {
      for (const h of p.portfolio.holdings) {
        const asset = GAME_ASSETS.find((a) => a.id === h.assetId)!;
        const purchasePrice =
          h.purchaseRound <= 1
            ? asset.startPrice
            : getBuyPrice(h.assetId, h.purchaseRound);
        const currentPriceVal = getEndPrice(h.assetId, p.currentRound);
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

    let bestSteady = playersList[0];
    let bestSteadyScore = -Infinity;
    for (const p of playersList) {
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
    const carbonReturn = (p: PlayerState) =>
      p.portfolio.holdings
        .filter((h) => goodCarbonIds.has(h.assetId))
        .reduce(
          (sum, h) => sum + h.units * getEndPrice(h.assetId, p.currentRound),
          0,
        );
    const greenwash = playersList.reduce((best, p) =>
      carbonReturn(p) > carbonReturn(best) ? p : best,
    );
    awards["greenwash"] = {
      playerId: greenwash.id,
      playerName: greenwash.name,
      value: carbonReturn(greenwash),
    };

    let bestContrarian = playersList[0];
    let bestContrarianReturn = 0;
    for (const p of playersList) {
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
          const currentPriceVal = getEndPrice(h.assetId, p.currentRound);
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

  async getAllPlayers(): Promise<Array<{ gameId: string; gameCode: string; gameStatus: string; playerId: string; name: string; email: string; currentRound: number; phase: PlayerPhase }>> {
    const rows = await db
      .select({
        gameId: games.id,
        gameCode: games.code,
        gameStatus: games.status,
        playerId: players.id,
        name: players.name,
        email: players.email,
        currentRound: players.currentRound,
        phase: players.phase,
      })
      .from(players)
      .innerJoin(games, eq(players.gameId, games.id));

    return rows.map((r) => {
      const rawPhase = (r.phase ?? "briefing") as PlayerPhase;
      const phase: PlayerPhase = rawPhase === "lobby" ? "briefing" : rawPhase;
      return { ...r, phase };
    });
  }

  async deletePlayer(gameId: string, playerId: string): Promise<void> {
    await db
      .delete(players)
      .where(eq(players.id, playerId));
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
    const allGames = await db.select().from(games);
    const entries: Array<{
      name: string;
      email: string;
      totalValue: number;
      gameCode: string;
      completedRound: number;
      date: string;
    }> = [];

    for (const gameRow of allGames) {
      const game = await this.getGame(gameRow.id);
      if (!game) continue;
      for (const player of Object.values(game.players)) {
        entries.push({
          name: player.name,
          email: player.email,
          totalValue: portfolioValue(player, player.currentRound),
          gameCode: game.code,
          completedRound: player.currentRound,
          date: gameRow.createdAt ? new Date(gameRow.createdAt).toISOString() : new Date().toISOString(),
        });
      }
    }

    entries.sort((a, b) => b.totalValue - a.totalValue);
    return entries.slice(0, 50).map((e, i) => ({ ...e, rank: i + 1 }));
  }
}
