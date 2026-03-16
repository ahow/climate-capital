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

function getAssetPrice(assetId: string, round: number): number {
  const asset = GAME_ASSETS.find((a) => a.id === assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);
  if (round <= 1) return asset.startPrice;
  // roundPrices[0] is the price at end of round 1 (i.e. price during round 2)
  // roundPrices[round-2] is the current price for round >= 2
  const idx = round - 2;
  if (idx < 0 || idx >= asset.roundPrices.length) {
    return asset.roundPrices[asset.roundPrices.length - 1];
  }
  return asset.roundPrices[idx];
}

function portfolioValue(player: PlayerState, round: number): number {
  let total = player.portfolio.cash;
  for (const h of player.portfolio.holdings) {
    total += h.units * getAssetPrice(h.assetId, round);
  }
  return total;
}

export interface IStorage {
  createGame(
    hostName: string,
    maxRounds: number,
    mode: "facilitator" | "self-paced",
  ): GameSession;
  getGame(id: string): GameSession | undefined;
  getGameByCode(code: string): GameSession | undefined;
  joinGame(gameId: string, playerName: string): PlayerState;
  getPlayer(gameId: string, playerId: string): PlayerState | undefined;
  submitTrades(gameId: string, playerId: string, trades: Trade[]): PlayerState;
  advanceRound(gameId: string): GameSession;
  setPhase(
    gameId: string,
    phase: GameSession["status"],
  ): GameSession;
  getLeaderboard(
    gameId: string,
  ): { playerId: string; name: string; totalValue: number; rank: number }[];
  calculateAwards(
    gameId: string,
  ): Record<string, { playerId: string; playerName: string; value: number }>;
}

export class MemStorage implements IStorage {
  private games: Map<string, GameSession> = new Map();

  createGame(
    hostName: string,
    maxRounds: number,
    mode: "facilitator" | "self-paced",
  ): GameSession {
    const id = randomUUID();
    let code = generateCode();
    // Ensure unique code
    while (Array.from(this.games.values()).some((g) => g.code === code)) {
      code = generateCode();
    }

    const game: GameSession = {
      id,
      code,
      hostName,
      status: "lobby",
      currentRound: 1,
      maxRounds,
      players: {},
      createdAt: Date.now(),
      phaseDeadline: null,
      mode,
    };
    this.games.set(id, game);
    return game;
  }

  getGame(id: string): GameSession | undefined {
    return this.games.get(id);
  }

  getGameByCode(code: string): GameSession | undefined {
    return Array.from(this.games.values()).find(
      (g) => g.code === code.toUpperCase(),
    );
  }

  joinGame(gameId: string, playerName: string): PlayerState {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    const id = randomUUID();
    const player: PlayerState = {
      id,
      name: playerName,
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

  getPlayer(gameId: string, playerId: string): PlayerState | undefined {
    const game = this.games.get(gameId);
    if (!game) return undefined;
    return game.players[playerId];
  }

  submitTrades(gameId: string, playerId: string, trades: Trade[]): PlayerState {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    const player = game.players[playerId];
    if (!player) throw new Error("Player not found");

    const round = game.currentRound;

    for (const trade of trades) {
      const asset = GAME_ASSETS.find((a) => a.id === trade.assetId);
      if (!asset) throw new Error(`Unknown asset: ${trade.assetId}`);

      const currentPrice = getAssetPrice(trade.assetId, round);

      if (trade.action === "buy") {
        // Validate cash
        if (trade.amount > player.portfolio.cash) {
          throw new Error(
            `Insufficient cash: have $${player.portfolio.cash}, need $${trade.amount}`,
          );
        }

        // Validate position limit (40% of total portfolio value)
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

        // Execute buy
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
        // Sell
        const holding = player.portfolio.holdings.find(
          (h) => h.assetId === trade.assetId,
        );
        if (!holding) {
          throw new Error(`No holding for asset: ${trade.assetId}`);
        }

        // Check lock
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

        // Execute sell
        const actualUnits = Math.min(unitsToSell, holding.units);
        player.portfolio.cash += actualUnits * currentPrice;
        holding.units -= actualUnits;

        // Remove empty holdings
        if (holding.units < 0.0001) {
          player.portfolio.holdings = player.portfolio.holdings.filter(
            (h) => h.assetId !== trade.assetId,
          );
        }
      }
    }

    return player;
  }

  advanceRound(gameId: string): GameSession {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    // Record portfolio values for all players at end of current round
    for (const player of Object.values(game.players)) {
      const value = portfolioValue(player, game.currentRound);
      player.valueHistory.push(value);
    }

    // Advance round
    game.currentRound += 1;

    // Update player current round
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

  setPhase(gameId: string, phase: GameSession["status"]): GameSession {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    game.status = phase;
    return game;
  }

  getLeaderboard(
    gameId: string,
  ): { playerId: string; name: string; totalValue: number; rank: number }[] {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    const entries = Object.values(game.players).map((player) => ({
      playerId: player.id,
      name: player.name,
      totalValue: portfolioValue(player, game.currentRound),
    }));

    // Sort descending by value
    entries.sort((a, b) => b.totalValue - a.totalValue);

    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  }

  calculateAwards(
    gameId: string,
  ): Record<string, { playerId: string; playerName: string; value: number }> {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    const players = Object.values(game.players);
    if (players.length === 0) return {};

    const round = game.currentRound;
    const awards: Record<
      string,
      { playerId: string; playerName: string; value: number }
    > = {};

    // Helper: get total value for a player
    const totalVal = (p: PlayerState) => portfolioValue(p, round);

    // champion: highest total portfolio value
    const champion = players.reduce((best, p) =>
      totalVal(p) > totalVal(best) ? p : best,
    );
    awards["champion"] = {
      playerId: champion.id,
      playerName: champion.name,
      value: totalVal(champion),
    };

    // alpha: highest total return (same as champion in this model)
    const alpha = players.reduce((best, p) =>
      totalVal(p) > totalVal(best) ? p : best,
    );
    awards["alpha"] = {
      playerId: alpha.id,
      playerName: alpha.name,
      value: totalVal(alpha) - STARTING_CASH,
    };

    // baron: highest return from fossil fuel holdings
    const fossilIds = new Set(["titan", "appcoal"]);
    const fossilReturn = (p: PlayerState) => {
      return p.portfolio.holdings
        .filter((h) => fossilIds.has(h.assetId))
        .reduce((sum, h) => sum + h.units * getAssetPrice(h.assetId, round), 0);
    };
    const baron = players.reduce((best, p) =>
      fossilReturn(p) > fossilReturn(best) ? p : best,
    );
    awards["baron"] = {
      playerId: baron.id,
      playerName: baron.name,
      value: fossilReturn(baron),
    };

    // stranded: largest single-position loss
    let worstLoss = 0;
    let strandedPlayer = players[0];
    for (const p of players) {
      for (const h of p.portfolio.holdings) {
        const asset = GAME_ASSETS.find((a) => a.id === h.assetId)!;
        const purchasePrice =
          h.purchaseRound <= 1
            ? asset.startPrice
            : getAssetPrice(h.assetId, h.purchaseRound);
        const currentPriceVal = getAssetPrice(h.assetId, round);
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

    // steady: best risk-adjusted return (lowest volatility with positive returns)
    // Use coefficient of variation on valueHistory; lower is better (among positive returns)
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
      // Sharpe-like: return / volatility
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

    // greenwash: best carbon credit selection (highest return from carbon assets, excluding vcm-standard)
    const goodCarbonIds = new Set(["eucarbon", "vcm-premium"]);
    const carbonReturn = (p: PlayerState) => {
      return p.portfolio.holdings
        .filter((h) => goodCarbonIds.has(h.assetId))
        .reduce((sum, h) => sum + h.units * getAssetPrice(h.assetId, round), 0);
    };
    const greenwash = players.reduce((best, p) =>
      carbonReturn(p) > carbonReturn(best) ? p : best,
    );
    awards["greenwash"] = {
      playerId: greenwash.id,
      playerName: greenwash.name,
      value: carbonReturn(greenwash),
    };

    // contrarian: best return from buying when asset class was down 20%+ from peak
    // Check each holding: was the asset price at purchase time 20%+ below its historical peak?
    let bestContrarian = players[0];
    let bestContrarianReturn = 0;
    for (const p of players) {
      let contReturn = 0;
      for (const h of p.portfolio.holdings) {
        const asset = GAME_ASSETS.find((a) => a.id === h.assetId)!;
        // Find peak price up to the purchase round
        let peak = asset.startPrice;
        for (let r = 1; r <= h.purchaseRound; r++) {
          const price = getAssetPrice(h.assetId, r);
          if (price > peak) peak = price;
        }
        const purchasePrice = getAssetPrice(h.assetId, h.purchaseRound);
        // Was it 20%+ below peak at purchase?
        if (purchasePrice <= peak * 0.8) {
          const currentPriceVal = getAssetPrice(h.assetId, round);
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
}

export const storage = new MemStorage();
