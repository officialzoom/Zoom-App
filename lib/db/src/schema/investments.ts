import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investmentsTable = pgTable("investments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  assetId: text("asset_id").notNull(),
  assetLabel: text("asset_label").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  expectedPayout: numeric("expected_payout", { precision: 15, scale: 2 }).notNull(),
  returnRate: numeric("return_rate", { precision: 5, scale: 2 }).notNull(),
  lockDays: integer("lock_days").notNull(),
  status: text("status").notNull().default("active"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInvestmentSchema = createInsertSchema(investmentsTable).omit({ createdAt: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investmentsTable.$inferSelect;
