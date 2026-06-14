import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletsTable = pgTable("wallets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  balance: numeric("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  activeInvestmentsValue: numeric("active_investments_value", { precision: 15, scale: 2 }).notNull().default("0"),
  totalEarnings: numeric("total_earnings", { precision: 15, scale: 2 }).notNull().default("0"),
  weeklyChange: numeric("weekly_change", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ createdAt: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
