export type JobKind = "evaluate_procurement" | "negotiate_bid" | "verify_transaction";

export type JobEnvelope = {
  id: string;
  organizationId: string;
  kind: JobKind;
  attempts: number;
  createdAt: Date;
};

export function isSupportedJob(kind: string): kind is JobKind {
  return ["evaluate_procurement", "negotiate_bid", "verify_transaction"].includes(kind);
}

if (process.argv[1]?.endsWith("index.ts")) {
  console.info("Alesxras worker is ready; no queue adapter is configured yet.");
}
