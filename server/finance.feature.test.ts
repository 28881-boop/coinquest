import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("finance feature authorization", () => {
  it("protects mission claiming from unauthenticated users", async () => {
    await expect(publicCaller().finance.missions.claim({ missionKey: "log_first" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("protects receipt parsing from unauthenticated users", async () => {
    await expect(publicCaller().finance.receipts.uploadAndParse({ dataUrl: "data:image/png;base64,aGVsbG8=", fileName: "receipt.png" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("protects personal AI analysis from unauthenticated users", async () => {
    await expect(publicCaller().finance.ai.analyzeSpending({ days: 30 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("protects personal AI follow-up questions from unauthenticated users", async () => {
    await expect(publicCaller().finance.ai.ask({ question: "ฉันควรลดค่าใช้จ่ายหมวดไหน?", days: 30 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
