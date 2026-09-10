export type ParentInput = { age: number; annualIncome: number };

export type ThaiTaxInputs = {
  salaryIncome: number;
  otherIncome: number;
  withholding: number;
  spouseNoIncome: boolean;
  parents: ParentInput[];
  childrenTotal: number;
  childrenBornSince2561: number;
  disabledDependents: number;
  age65PlusOrDisabled: boolean;
  lifeInsurance: number;
  parentHealthInsurance: number;
  socialSecurity: number;
  providentFund: number;
  rmf: number;
  homeLoanInterest: number;
  donations: number;
  otherAllowances: number;
};

export type ThaiTaxResult = {
  totalIncome: number;
  expenseDeduction: number;
  totalAllowances: number;
  donationAllowance: number;
  taxableIncome: number;
  tax: number;
  withholding: number;
  balance: number;
  effectiveRate: number;
  details: Array<{ label: string; amount: number; note: string }>;
  warnings: string[];
};

const n = (value: number) => Number.isFinite(value) && value > 0 ? Math.round(value) : 0;

export function calculateThaiTax(input: ThaiTaxInputs): ThaiTaxResult {
  const salaryIncome = n(input.salaryIncome);
  const otherIncome = n(input.otherIncome);
  const totalIncome = salaryIncome + otherIncome;
  const expenseDeduction = Math.min(Math.round(salaryIncome * 0.5), 100000);
  const eligibleParents = (input.parents ?? []).filter(parent => n(parent.age) >= 60 && n(parent.annualIncome) <= 30000).length;
  const childrenTotal = Math.min(20, n(input.childrenTotal));
  const childrenBornSince2561 = Math.min(childrenTotal, n(input.childrenBornSince2561));
  const details: ThaiTaxResult["details"] = [
    { label: "ค่าลดหย่อนส่วนตัว", amount: 60000, note: "มาตรฐานผู้มีเงินได้" },
  ];
  if (input.spouseNoIncome) details.push({ label: "คู่สมรสไม่มีเงินได้", amount: 60000, note: "ตามเงื่อนไขผู้มีเงินได้" });
  if (childrenTotal) details.push({ label: `บุตร ${childrenTotal} คน`, amount: childrenTotal * 30000 + childrenBornSince2561 * 30000, note: `เพิ่มสิทธิสำหรับบุตรที่เกิดตั้งแต่ปี 2561 จำนวน ${childrenBornSince2561} คน` });
  if (eligibleParents) details.push({ label: `อุปการะบิดามารดา ${eligibleParents} คน`, amount: eligibleParents * 30000, note: "อายุอย่างน้อย 60 ปี และมีเงินได้ไม่เกิน 30,000 บาท/ปี" });
  if (n(input.disabledDependents)) details.push({ label: "อุปการะคนพิการ/ทุพพลภาพ", amount: n(input.disabledDependents) * 60000, note: "ต้องมีคุณสมบัติตามหลักเกณฑ์และเอกสารรับรอง" });
  if (input.age65PlusOrDisabled) details.push({ label: "ยกเว้นเงินได้ผู้สูงอายุ/ผู้พิการ", amount: 190000, note: "ใช้ได้เมื่อเข้าเงื่อนไขตามกฎหมาย ไม่ใช่ค่าลดหย่อนทั่วไป" });
  const lifeInsurance = Math.min(n(input.lifeInsurance), 100000);
  const parentHealthInsurance = Math.min(n(input.parentHealthInsurance), 15000);
  const socialSecurity = Math.min(n(input.socialSecurity), 9000);
  const rmfAllowed = Math.min(n(input.rmf), Math.floor(totalIncome * 0.15), 500000);
  const savingsAllowed = Math.min(n(input.providentFund) + rmfAllowed, 500000);
  const homeLoanInterest = Math.min(n(input.homeLoanInterest), 100000);
  const otherAllowances = n(input.otherAllowances);
  if (lifeInsurance) details.push({ label: "เบี้ยประกันชีวิต", amount: lifeInsurance, note: "ตามจริง ไม่เกิน 100,000 บาท" });
  if (parentHealthInsurance) details.push({ label: "เบี้ยประกันสุขภาพบิดามารดา", amount: parentHealthInsurance, note: "ตามจริง ไม่เกิน 15,000 บาท" });
  if (socialSecurity) details.push({ label: "เงินสมทบประกันสังคม", amount: socialSecurity, note: "ตามจริง ไม่เกิน 9,000 บาท" });
  if (savingsAllowed) details.push({ label: "กองทุนสำรองเลี้ยงชีพ/RMF", amount: savingsAllowed, note: "รวมตามเพดาน 500,000 บาท; RMF จำกัด 15% ของเงินได้" });
  if (homeLoanInterest) details.push({ label: "ดอกเบี้ยกู้ซื้อที่อยู่อาศัย", amount: homeLoanInterest, note: "ตามจริง ไม่เกิน 100,000 บาท" });
  if (otherAllowances) details.push({ label: "ค่าลดหย่อนอื่น ๆ ที่ผู้ใช้ระบุ", amount: otherAllowances, note: "ต้องตรวจสอบสิทธิและเพดานของรายการนั้นแยกต่างหาก" });
  const fixedAllowances = details.reduce((sum, item) => sum + item.amount, 0);
  const donationAllowance = Math.min(n(input.donations), Math.floor(Math.max(0, totalIncome - expenseDeduction - fixedAllowances) * 0.1));
  if (donationAllowance) details.push({ label: "เงินบริจาคทั่วไปที่นำมาหักได้", amount: donationAllowance, note: "จำกัดไม่เกิน 10% ของฐานหลังหักรายการก่อนหน้า" });
  const totalAllowances = fixedAllowances + donationAllowance;
  const taxableIncome = Math.max(0, totalIncome - expenseDeduction - totalAllowances);
  const bands: Array<[number, number]> = [[150000, 0], [150000, 0.05], [200000, 0.1], [250000, 0.15], [1000000, 0.2], [Infinity, 0.35]];
  let remaining = taxableIncome; let tax = 0;
  for (const [width, rate] of bands) { const slice = Math.min(remaining, width); if (slice <= 0) break; tax += slice * rate; remaining -= slice; }
  const roundedTax = Math.round(tax);
  const withholding = n(input.withholding);
  const warnings = [
    "ผลลัพธ์เป็นประมาณการเบื้องต้น ไม่ใช่การยื่นแบบหรือคำวินิจฉัยจากกรมสรรพากร",
    "ตรวจสอบปีภาษี ประเภทเงินได้ เอกสาร และสิทธิที่ใช้จริงก่อนยื่น ภ.ง.ด.90/91",
  ];
  if (otherIncome > 0) warnings.push("รายได้อื่นถูกป้อนเป็นยอดหลังหักค่าใช้จ่ายแล้ว หากยังไม่หักค่าใช้จ่ายควรปรึกษาผู้เชี่ยวชาญ");
  return { totalIncome, expenseDeduction, totalAllowances, donationAllowance, taxableIncome, tax: roundedTax, withholding, balance: roundedTax - withholding, effectiveRate: totalIncome ? roundedTax / totalIncome : 0, details, warnings };
}
