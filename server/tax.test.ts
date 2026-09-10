import { describe, expect, it } from "vitest";
import { calculateThaiTax } from "../shared/tax";

const base = {
  salaryIncome: 0, otherIncome: 0, withholding: 0, spouseNoIncome: false,
  parents: [], childrenTotal: 0, childrenBornSince2561: 0, disabledDependents: 0,
  age65PlusOrDisabled: false, lifeInsurance: 0, parentHealthInsurance: 0,
  socialSecurity: 0, providentFund: 0, rmf: 0, homeLoanInterest: 0, donations: 0, otherAllowances: 0,
};

describe("calculateThaiTax", () => {
  it("applies parent allowance only when each parent meets age and income rules", () => {
    const result = calculateThaiTax({ ...base, salaryIncome: 500000, parents: [{ age: 60, annualIncome: 30000 }, { age: 59, annualIncome: 0 }, { age: 70, annualIncome: 30001 }] });
    expect(result.details.find(item => item.label.includes("บิดามารดา"))?.amount).toBe(30000);
  });

  it("adds the extra child allowance for children born from 2561 onward", () => {
    const result = calculateThaiTax({ ...base, salaryIncome: 500000, childrenTotal: 2, childrenBornSince2561: 1 });
    expect(result.details.find(item => item.label.includes("บุตร"))?.amount).toBe(90000);
  });

  it("caps common paid deductions and calculates progressive tax", () => {
    const result = calculateThaiTax({ ...base, salaryIncome: 1000000, lifeInsurance: 150000, socialSecurity: 20000, homeLoanInterest: 120000, withholding: 10000 });
    expect(result.details.find(item => item.label === "เบี้ยประกันชีวิต")?.amount).toBe(100000);
    expect(result.details.find(item => item.label.includes("ประกันสังคม"))?.amount).toBe(9000);
    expect(result.details.find(item => item.label === "ดอกเบี้ยกู้ซื้อที่อยู่อาศัย")?.amount).toBe(100000);
    expect(result.tax).toBeGreaterThan(0);
    expect(result.balance).toBe(result.tax - 10000);
  });
});
