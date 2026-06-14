import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetTiersTable = pgTable("asset_tiers", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  entryAmount: numeric("entry_amount", { precision: 15, scale: 2 }).notNull(),
  returnRate: numeric("return_rate", { precision: 5, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  slotsUsed: integer("slots_used").notNull().default(0),
  totalSlots: integer("total_slots").notNull(),
  tag: text("tag").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  bgColor: text("bg_color").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssetTierSchema = createInsertSchema(assetTiersTable).omit({ createdAt: true });
export type InsertAssetTier = z.infer<typeof insertAssetTierSchema>;
export type AssetTier = typeof assetTiersTable.$inferSelect;
