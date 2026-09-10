import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const user = { id: 1, openId: "tax-test", email: "tax@example.com", name: "Tax Test", loginMethod: "test", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const base = { salaryIncome: 360000, otherIncome: 0, withholding: 0, spouseNoIncome: false, parents: [], childrenTotal: 0, childrenBornSince2561: 0, disabledDependents: 0, age65PlusOrDisabled: false, lifeInsurance: 0, parentHealthInsurance: 0, socialSecurity: 0, providentFund: 0, rmf: 0, homeLoanInterest: 0, donations: 0, otherAllowances: 0 };
function caller() { return appRouter.createCaller({ user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }); }

describe("finance.tax.estimate", () => {
  it("applies the progressive tax bands and basic allowance", async () => {
    const result = await caller().finance.tax.estimate(base);
    expect(result.taxableIncome).toBe(200000);
    expect(result.tax).toBe(2500);
    expect(result.effectiveRate).toBeCloseTo(2500 / 360000);
  });

  it("never produces a negative taxable income or tax", async () => {
    const result = await caller().finance.tax.estimate({ ...base, salaryIncome: 50000, lifeInsurance: 100000 });
    expect(result).toMatchObject({ taxableIncome: 0, tax: 0, effectiveRate: 0 });
  });
});
