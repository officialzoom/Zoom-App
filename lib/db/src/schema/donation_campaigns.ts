import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const donationCampaignsTable = pgTable("donation_campaigns", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  raisedAmount: numeric("raised_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  color: text("color").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDonationCampaignSchema = createInsertSchema(donationCampaignsTable).omit({ createdAt: true, updatedAt: true });
export type InsertDonationCampaign = z.infer<typeof insertDonationCampaignSchema>;
export type DonationCampaign = typeof donationCampaignsTable.$inferSelect;
