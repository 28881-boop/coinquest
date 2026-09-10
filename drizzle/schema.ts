import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  amount: int("amount").notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  note: varchar("note", { length: 255 }),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  targetAmount: int("targetAmount").notNull(),
  savedAmount: int("savedAmount").default(0).notNull(),
  emoji: varchar("emoji", { length: 8 }).default("🎯").notNull(),
  deadline: timestamp("deadline"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userProgress = mysqlTable("userProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  xp: int("xp").default(0).notNull(),
  level: int("level").default(1).notNull(),
  streak: int("streak").default(0).notNull(),
  lastActivityAt: timestamp("lastActivityAt"),
  realityLevel: mysqlEnum("realityLevel", ["gentle", "tease", "ouch", "serious"]).default("tease").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const receipts = mysqlTable("receipts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["processing", "parsed", "needs_review", "failed"]).default("processing").notNull(),
  parsedAmount: int("parsedAmount"),
  parsedCategory: varchar("parsedCategory", { length: 80 }),
  parsedNote: varchar("parsedNote", { length: 255 }),
  parsedOccurredAt: timestamp("parsedOccurredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const missionClaims = mysqlTable("missionClaims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  missionKey: varchar("missionKey", { length: 80 }).notNull(),
  xpAwarded: int("xpAwarded").notNull(),
  claimedAt: timestamp("claimedAt").defaultNow().notNull(),
}, table => ({
  userMissionUnique: uniqueIndex("missionClaims_user_mission_unique").on(table.userId, table.missionKey),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type MissionClaim = typeof missionClaims.$inferSelect;
