"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Detail = {
  request: {
    id: string; title: string; description: string; requirements: string[]; status: string;
    budget_amount: string | null; token_id: string; created_at: string; opens_at: string | null; closes_at: string | null;
  };
  proposals: Array<{
    id: string; status: string; submittedAt: string | null; tokenId: string | null;
    supplier: { name: string; accountId: string | null }; contentEncrypted: boolean; amountEncrypted: boolean;
  }>;
  review: { canApprove: boolean; reason: string };
};

const labels: Record<string, string> = {
  draft: "Draft", open: "Open for proposals", evaluating: "Evaluating", negotiating: "Negotiating",
  awaiting_approval: "Awaiting approval", approved: "Approved", executing: "Execution",
  completed: "Completed", cancelled: "Cancelled", submitted: "Submitted",
};

function date(value: string | null) {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : parsed.toLocaleString();
}

export function ProcurementRequestDetail({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/workspace/requests/${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json() as Detail & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load request.");
      setDetail(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load request.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [id]);

  if (loading) return <main className="detail-shell"><p className="detail-muted">Loading procurement record…</p></main>;
  if (error || !detail) return <main className="detail-shell"><Link className="detail-back" href="/workspace">← Workspace</Link><section className="detail-panel"><h1>Request unavailable</h1><p>{error || "This request could not be found."}</p><button className="secondary-button" onClick={() => void load()}>Try again</button></section></main>;

  const item = detail.request;
  return <main className="detail-shell">
    <Link className="detail-back" href="/workspace">← Back to workspace</Link>
    <header className="detail-header"><div><p className="eyebrow">Procurement record · PR-{item.id.slice(0, 8).toUpperCase()}</p><h1>{item.title}</h1><p className="detail-muted">Created {date(item.created_at)}</p></div><span className="status-pill"><i />{labels[item.status] || item.status}</span></header>
    <section className="detail-panel"><h2>Project brief</h2><p className="detail-description">{item.description}</p>
      <div className="detail-facts"><div><span>Budget</span><strong>{item.budget_amount ? `${item.budget_amount} ${item.token_id} base units` : "Not specified"}</strong></div><div><span>Opens</span><strong>{date(item.opens_at)}</strong></div><div><span>Closes</span><strong>{date(item.closes_at)}</strong></div></div>
      {item.requirements?.length > 0 && <><h3>Requirements</h3><ul className="detail-requirements">{item.requirements.map((requirement, index) => <li key={index}>{requirement}</li>)}</ul></>}
    </section>
    <section className="detail-panel"><div className="panel-heading"><div><h2>Supplier proposals</h2><p>{detail.proposals.length} submitted record{detail.proposals.length === 1 ? "" : "s"}</p></div><button className="text-link" onClick={() => void load()}>Refresh</button></div>
      {detail.proposals.length === 0 ? <p className="detail-muted detail-empty">No supplier proposals have been submitted for this request yet.</p> : <div className="proposal-list">{detail.proposals.map((proposal) => <article className="proposal-row" key={proposal.id}><div><strong>{proposal.supplier.name}</strong><span>{proposal.supplier.accountId || "Supplier account not available"}</span></div><span className="status-pill"><i />{labels[proposal.status] || proposal.status}</span><small>Submitted {date(proposal.submittedAt)}</small><p>Proposal content and amount are encrypted at rest. Secure review is unavailable until the workspace decryption service is configured.</p></article>)}</div>}
    </section>
    <section className="detail-panel human-control"><h2>Human review and approval</h2><p>{detail.review.reason}</p><button className="secondary-button" type="button" disabled title="Approval remains disabled until secure review and policy checks are implemented.">Approval unavailable</button><small>No agent or background process can approve, sign or submit a payment.</small></section>
  </main>;
}
