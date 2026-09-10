import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("finance.tax.estimate", () => {
  it("applies the progressive tax bands and basic allowance", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    const result = await caller.finance.tax.estimate({ annualIncome: 360000, deductions: 0 });

    expect(result.taxable).toBe(300000);
    expect(result.tax).toBe(7500);
    expect(result.effectiveRate).toBeCloseTo(7500 / 360000);
  });

  it("never produces a negative taxable income or tax", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    const result = await caller.finance.tax.estimate({ annualIncome: 50000, deductions: 100000 });

    expect(result).toMatchObject({ taxable: 0, tax: 0, effectiveRate: 0 });
  });
});
