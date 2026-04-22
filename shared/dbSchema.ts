import { pgTable, uuid, text, integer, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("lobby"),
  currentRound: integer("current_round").notNull().default(1),
  maxRounds: integer("max_rounds").notNull().default(8),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  phaseDeadline: timestamp("phase_deadline"),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id").notNull().references(() => games.id),
  name: varchar("name", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  currentRound: integer("current_round").notNull().default(1),
  phase: varchar("phase", { length: 20 }).notNull().default("briefing"),
  portfolio: jsonb("portfolio").notNull().$type<{
    cash: number;
    holdings: Array<{
      assetId: string;
      units: number;
      purchaseRound: number;
      lockedUntilRound: number;
    }>;
  }>(),
  valueHistory: jsonb("value_history").notNull().$type<number[]>().default([]),
  predictions: jsonb("predictions")
    .notNull()
    .$type<Array<{ round: number; question: string; answer: string; correct: boolean }>>()
    .default([]),
});
