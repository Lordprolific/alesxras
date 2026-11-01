import assert from "node:assert/strict";
import test from "node:test";
import { assertAgentBudget, assertToolAllowed } from "./index.ts";

test("agent budgets are finite and bounded", () => {
  assert.throws(() => assertAgentBudget({ maxSteps: 41, maxDurationMs: 1000, maxProviderSpendMicrousd: 1 }), /step budget/);
});

test("agent tool access is explicit", () => {
  assert.throws(() => assertToolAllowed({
    organizationId: "org", procurementId: "proc", runId: "run",
    permissions: new Set(["read_procurement"]),
    budget: { maxSteps: 5, maxDurationMs: 1000, maxProviderSpendMicrousd: 1 },
  }, "request_approval"), /permission denied/);
});
