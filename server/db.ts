import { and, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, goals, transactions, userProgress, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listTransactions(userId: number, from?: Date, to?: Date) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(transactions.userId, userId)];
  if (from) filters.push(gte(transactions.occurredAt, from));
  if (to) filters.push(lt(transactions.occurredAt, to));
  return db.select().from(transactions).where(and(...filters)).orderBy(desc(transactions.occurredAt)).limit(100);
}

export async function listGoals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
}

export async function getProgress(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  return result[0];
}

export async function ensureProgress(userId: number) {
  const existing = await getProgress(userId);
  if (existing) return existing;
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(userProgress).values({ userId });
  return getProgress(userId);
}
