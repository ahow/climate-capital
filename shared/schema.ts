import { z } from "zod";

// ── Types (no DB needed — in-memory game state) ──

export interface GameAsset {
  id: string;
  name: string;
  realBasis: string;
  assetClass: "equity" | "etf" | "credit" | "infrastructure" | "carbon" | "thematic";
  sector: string;
  description: string;
  riskLevel: "low" | "medium" | "high" | "very-high";
  // Price per unit at game start (Round 1). All prices normalised to $100 starting value.
  startPrice: number;
  // Price at the end of each round [round1End, round2End, ...]
  roundPrices: number[];
  // Whether this asset is locked (illiquid) for N rounds after purchase
  lockRounds: number;
  // Minimum allocation in $M
  minAllocation: number;
}

export interface RoundBriefing {
  round: number;
  title: string;
  period: string;
  contextBullets: string[];
  keyQuestion: string;
}

export interface RoundTakeaway {
  round: number;
  takeaways: string[];
  didYouKnow: string;
}

export interface Holding {
  assetId: string;
  units: number; // number of units held
  purchaseRound: number; // when first purchased
  lockedUntilRound: number; // cannot sell before this round
}

export interface PlayerPortfolio {
  cash: number;
  holdings: Holding[];
}

export interface PlayerState {
  id: string;
  name: string;
  currentRound: number;
  portfolio: PlayerPortfolio;
  // Value history: total portfolio value at end of each completed round
  valueHistory: number[];
  // Track predictions
  predictions: { round: number; question: string; answer: string; correct: boolean }[];
}

export interface GameSession {
  id: string;
  code: string; // 6-char join code
  hostName: string;
  status: "lobby" | "briefing" | "trading" | "results" | "takeaways" | "finished";
  currentRound: number;
  maxRounds: number;
  players: Record<string, PlayerState>;
  createdAt: number;
  // Facilitator-paced: when the current phase timer expires
  phaseDeadline: number | null;
  mode: "facilitator" | "self-paced";
}

// ── Zod schemas for API validation ──

export const joinGameSchema = z.object({
  code: z.string().min(4).max(8),
  playerName: z.string().min(1).max(30),
});

export const createGameSchema = z.object({
  hostName: z.string().min(1).max(30),
  maxRounds: z.number().min(5).max(8).default(8),
  mode: z.enum(["facilitator", "self-paced"]).default("self-paced"),
});

export const tradeSchema = z.object({
  assetId: z.string(),
  action: z.enum(["buy", "sell"]),
  amount: z.number().min(1), // in $M
});

export const submitTradesSchema = z.object({
  trades: z.array(tradeSchema),
});

export type JoinGame = z.infer<typeof joinGameSchema>;
export type CreateGame = z.infer<typeof createGameSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type SubmitTrades = z.infer<typeof submitTradesSchema>;
