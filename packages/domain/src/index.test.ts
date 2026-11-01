import assert from "node:assert/strict";
import test from "node:test";
import { assertApprovalMatchesTransfer, assertWithinSpendingPolicy, canTransition } from "./index.ts";

test("procurement transitions protect terminal and approval states", () => {
  assert.equal(canTransition("open", "evaluating"), true);
  assert.equal(canTransition("open", "executing"), false);
  assert.equal(canTransition("completed", "open"), false);
});

test("spending policy rejects an amount above the transaction cap", () => {
  assert.throws(() => assertWithinSpendingPolicy(101n, {
    maxPerTransactionYocto: 100n,
    maxDailyYocto: 1_000n,
    dailySpentYocto: 0n,
  }), /per-transaction/);
});

test("approved amount and recipient must match exactly", () => {
  const approval = {
    id: "approval-1", organizationId: "org-1", procurementId: "proc-1", approverId: "user-1",
    approvedAt: new Date("2026-01-01T00:00:00Z"), amountYocto: 42n,
    recipientAccountId: "supplier.near", status: "approved" as const,
  };
  assert.throws(() => assertApprovalMatchesTransfer(approval, {
    amountYocto: 42n, recipientAccountId: "other.near",
  }), /recipient/);
});
