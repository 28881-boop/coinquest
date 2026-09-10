import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { goals, transactions, userProgress } from "../drizzle/schema";
import { ensureProgress, getDb, getProgress, listGoals, listTransactions } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const categorySchema = z.string().min(1).max(80);
const transactionInput = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().int().positive().max(100000000),
  category: categorySchema,
  note: z.string().max(255).optional(),
  occurredAt: z.string().optional(),
});

function monthBounds() {
  const now = new Date();
  return {
    from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function buildRealityCheck(expense: number, level: string) {
  if (expense <= 0) return "เริ่มบันทึกวันนี้ แล้วเราจะช่วยดูแลเงินไปด้วยกัน ✨";
  const monthly = Math.round(expense * 30);
  const annual = Math.round(expense * 365);
  const messages: Record<string, string> = {
    gentle: `วันนี้ใช้ไป ฿${expense.toLocaleString()} นะ ค่อย ๆ วางแผนกันได้ ไม่ต้องกดดัน 💛`,
    tease: `วันนี้ใช้ ฿${expense.toLocaleString()} ถ้าเป็นเกม นี่คือบอสรายจ่ายที่ต้องชนะแล้วนะ 😏`,
    ouch: `ใช้แบบนี้ต่อไปจะหายไปประมาณ ฿${monthly.toLocaleString()}/เดือน หรือ ฿${annual.toLocaleString()}/ปี เจ็บนิดแต่จริง 💸`,
    serious: `Reality check: รูปแบบการใช้วันนี้อาจทำให้เสีย ฿${annual.toLocaleString()} ต่อปี หยุด 1 นาทีแล้วทบทวนก่อนจ่ายครั้งต่อไป`,
  };
  return messages[level] ?? messages.tease;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  finance: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const { from, to } = monthBounds();
      const [monthRows, allRows, userGoals, progress] = await Promise.all([
        listTransactions(ctx.user.id, from, to),
        listTransactions(ctx.user.id),
        listGoals(ctx.user.id),
        ensureProgress(ctx.user.id),
      ]);
      const income = monthRows.filter(row => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
      const expense = monthRows.filter(row => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
      const categoryMap = new Map<string, number>();
      for (const row of monthRows.filter(item => item.type === "expense")) {
        categoryMap.set(row.category, (categoryMap.get(row.category) ?? 0) + row.amount);
      }
      const categories = Array.from(categoryMap.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayExpense = allRows.filter(row => row.type === "expense" && new Date(row.occurredAt).toISOString().slice(0, 10) === todayKey).reduce((sum, row) => sum + row.amount, 0);
      const level = progress?.realityLevel ?? "tease";
      return {
        summary: { income, expense, balance: income - expense, todayExpense },
        categories,
        transactions: allRows.slice(0, 8),
        goals: userGoals,
        progress: progress ?? { xp: 0, level: 1, streak: 0, realityLevel: "tease" },
        realityCheck: buildRealityCheck(todayExpense, level),
      };
    }),
    transactions: router({
      list: protectedProcedure.query(({ ctx }) => listTransactions(ctx.user.id)),
      create: protectedProcedure.input(transactionInput).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not configured");
        const amount = Math.round(input.amount);
        await db.insert(transactions).values({
          userId: ctx.user.id,
          type: input.type,
          amount,
          category: input.category,
          note: input.note,
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        });
        const progress = await ensureProgress(ctx.user.id);
        if (progress) {
          const xpGain = input.type === "income" ? 20 : 10;
          const xp = progress.xp + xpGain;
          const level = Math.max(1, Math.floor(xp / 100) + 1);
          const streak = progress.lastActivityAt && new Date(progress.lastActivityAt).toISOString().slice(0, 10) === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? progress.streak + 1 : Math.max(progress.streak, 1);
          await db.update(userProgress).set({ xp, level, streak, lastActivityAt: new Date() }).where(eq(userProgress.userId, ctx.user.id));
        }
        return { success: true } as const;
      }),
      update: protectedProcedure.input(transactionInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not configured");
        const result = await db.update(transactions).set({ type: input.type, amount: input.amount, category: input.category, note: input.note, occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined }).where(and(eq(transactions.id, input.id), eq(transactions.userId, ctx.user.id)));
        return { success: true, changed: result[0]?.affectedRows ?? 0 } as const;
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not configured");
        await db.delete(transactions).where(and(eq(transactions.id, input.id), eq(transactions.userId, ctx.user.id)));
        return { success: true } as const;
      }),
    }),
    goals: router({
      list: protectedProcedure.query(({ ctx }) => listGoals(ctx.user.id)),
      create: protectedProcedure.input(z.object({ title: z.string().min(1).max(120), targetAmount: z.number().int().positive(), emoji: z.string().max(8).optional(), deadline: z.string().optional() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not configured");
        await db.insert(goals).values({ userId: ctx.user.id, title: input.title, targetAmount: input.targetAmount, emoji: input.emoji ?? "🎯", deadline: input.deadline ? new Date(input.deadline) : undefined });
        return { success: true } as const;
      }),
      contribute: protectedProcedure.input(z.object({ id: z.number().int().positive(), amount: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not configured");
        const current = await db.select().from(goals).where(and(eq(goals.id, input.id), eq(goals.userId, ctx.user.id))).limit(1);
        if (!current[0]) throw new Error("Goal not found");
        const savedAmount = current[0].savedAmount + input.amount;
        await db.update(goals).set({ savedAmount }).where(and(eq(goals.id, input.id), eq(goals.userId, ctx.user.id)));
        return { success: true, savedAmount } as const;
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not configured");
        await db.delete(goals).where(and(eq(goals.id, input.id), eq(goals.userId, ctx.user.id)));
        return { success: true } as const;
      }),
    }),
    progress: router({
      get: protectedProcedure.query(({ ctx }) => ensureProgress(ctx.user.id)),
      setRealityLevel: protectedProcedure.input(z.object({ level: z.enum(["gentle", "tease", "ouch", "serious"]) })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database is not configured");
        await ensureProgress(ctx.user.id);
        await db.update(userProgress).set({ realityLevel: input.level }).where(eq(userProgress.userId, ctx.user.id));
        return { success: true } as const;
      }),
    }),
    tax: router({
      estimate: publicProcedure.input(z.object({ annualIncome: z.number().nonnegative(), deductions: z.number().nonnegative().default(0) })).query(({ input }) => {
        const taxable = Math.max(0, input.annualIncome - 60000 - input.deductions);
        const bands = [[150000, 0], [150000, 0.05], [200000, 0.1], [250000, 0.15], [1000000, 0.2], [Infinity, 0.35]] as const;
        let remaining = taxable;
        let tax = 0;
        for (const [width, rate] of bands) {
          const slice = Math.min(remaining, width);
          if (slice <= 0) break;
          tax += slice * rate;
          remaining -= slice;
        }
        return { taxable, tax: Math.round(tax), effectiveRate: taxable ? tax / input.annualIncome : 0 };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
