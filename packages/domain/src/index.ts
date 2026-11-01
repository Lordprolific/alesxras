export type ProcurementStatus =
  | "draft"
  | "open"
  | "evaluating"
  | "negotiating"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "completed"
  | "cancelled";

const transitions: Record<ProcurementStatus, readonly ProcurementStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["evaluating", "cancelled"],
  evaluating: ["negotiating", "awaiting_approval", "cancelled"],
  negotiating: ["evaluating", "awaiting_approval", "cancelled"],
  awaiting_approval: ["approved", "evaluating", "cancelled"],
  approved: ["executing", "cancelled"],
  executing: ["completed", "approved"],
  completed: [],
  cancelled: [],
};

export function canTransition(current: ProcurementStatus, next: ProcurementStatus): boolean {
  return transitions[current].includes(next);
}

export function assertTransition(current: ProcurementStatus, next: ProcurementStatus): void {
  if (!canTransition(current, next)) throw new Error(`Invalid procurement transition: ${current} -> ${next}`);
}

export type SpendingPolicy = {
  maxPerTransactionYocto: bigint;
  maxDailyYocto: bigint;
  dailySpentYocto: bigint;
};

export function assertWithinSpendingPolicy(amountYocto: bigint, policy: SpendingPolicy): void {
  if (amountYocto <= 0n) throw new Error("Amount must be positive");
  if (amountYocto > policy.maxPerTransactionYocto) throw new Error("Amount exceeds the per-transaction spending limit");
  if (policy.dailySpentYocto + amountYocto > policy.maxDailyYocto) throw new Error("Amount exceeds the remaining daily spending limit");
}

export type Approval = {
  id: string;
  organizationId: string;
  procurementId: string;
  approverId: string;
  approvedAt: Date;
  amountYocto: bigint;
  recipientAccountId: string;
  status: "pending" | "approved" | "rejected" | "consumed";
};

export function assertApprovalMatchesTransfer(
  approval: Approval,
  transfer: { amountYocto: bigint; recipientAccountId: string },
): void {
  if (approval.status !== "approved") throw new Error("Approval is not active");
  if (approval.amountYocto !== transfer.amountYocto) throw new Error("Transfer amount does not match the approved amount");
  if (approval.recipientAccountId !== transfer.recipientAccountId) throw new Error("Transfer recipient does not match the approved recipient");
}
