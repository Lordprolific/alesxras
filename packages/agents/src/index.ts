export type AgentBudget = {
  maxSteps: number;
  maxDurationMs: number;
  maxProviderSpendMicrousd: number;
};

export type ToolPermission = "read_procurement" | "read_bids" | "propose_negotiation" | "request_approval";

export type AgentRunContext = {
  organizationId: string;
  procurementId: string;
  runId: string;
  permissions: ReadonlySet<ToolPermission>;
  budget: AgentBudget;
};

export function assertAgentBudget(budget: AgentBudget): void {
  if (!Number.isInteger(budget.maxSteps) || budget.maxSteps < 1 || budget.maxSteps > 40) {
    throw new Error("Agent step budget must be between 1 and 40");
  }
  if (budget.maxDurationMs < 1 || budget.maxDurationMs > 300_000) {
    throw new Error("Agent duration budget must be between 1ms and 5 minutes");
  }
  if (budget.maxProviderSpendMicrousd < 0) throw new Error("Agent spend budget cannot be negative");
}

export function assertToolAllowed(context: AgentRunContext, permission: ToolPermission): void {
  if (!context.permissions.has(permission)) throw new Error(`Agent permission denied: ${permission}`);
}
