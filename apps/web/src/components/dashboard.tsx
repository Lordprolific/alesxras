"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspaceSession } from "@/components/workspace-session";

type ProcurementRequest = {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  status: string;
  budget_amount: string | null;
  token_id: string;
  created_at: string;
  bid_count: number;
};

type WorkspaceData = {
  workspace: { name: string; role: string; accountId: string };
  requests: ProcurementRequest[];
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  open: "Open for proposals",
  evaluating: "Evaluating",
  negotiating: "Negotiating",
  awaiting_approval: "Awaiting approval",
  approved: "Approved",
  executing: "Execution",
  completed: "Completed",
  cancelled: "Cancelled",
};

function formatBaseUnits(value: string, token: string) {
  const normalized = value.replace(/^0+(?=\d)/, "");
  return `${normalized} ${token} base units`;
}

function shortId(id: string) {
  return `PR-${id.slice(0, 8).toUpperCase()}`;
}

export function Dashboard() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/requests", { cache: "no-store" });
      const result = await response.json() as WorkspaceData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load workspace.");
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const requests = useMemo(() => (data?.requests ?? []).filter((item) => {
    const matchesSearch = `${item.title} ${item.description} ${shortId(item.id)}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === "all" || item.status === status);
  }), [data, search, status]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const requirements = String(form.get("requirements") || "").split("
").map((line) => line.trim()).filter(Boolean);
    try {
      const response = await fetch("/api/workspace/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          budgetAmount: form.get("budgetAmount"),
          tokenId: form.get("tokenId"),
          requirements,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Request could not be created.");
      formElement.reset();
      setShowCreate(false);
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Request could not be created.");
    } finally {
      setSaving(false);
    }
  }

  const openCount = (data?.requests ?? []).filter((item) => ["open", "evaluating", "negotiating"].includes(item.status)).length;
  const approvalCount = (data?.requests ?? []).filter((item) => item.status === "awaiting_approval").length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview"><span className="brand-mark" aria-hidden="true">A</span><span>alesxras</span></a>
        <div className="workspace-switcher">
          <div className="workspace-avatar">{data?.workspace.name.slice(0, 1).toUpperCase() || "A"}</div>
          <div className="workspace-name"><strong>{data?.workspace.name || "Your workspace"}</strong><span>{data?.workspace.role || "Procurement workspace"}</span></div>
        </div>
        <p className="nav-heading">Workspace</p>
        <nav className="primary-nav" aria-label="Workspace navigation">
          <a className="nav-item active" href="#overview">Overview</a>
          <a className="nav-item" href="#requests">Procurement</a>
          <a className="nav-item" href="#create-request" onClick={() => setShowCreate(true)}>New request</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card"><span className="network-dot pending" /><div><strong>NEAR testnet</strong><span>Human approval required</span></div></div>
          <div className="profile-row"><div className="profile-avatar">W</div><div className="workspace-name"><strong>Connected wallet</strong><span>{data?.workspace.accountId || "Verifying session"}</span></div></div>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>{data?.workspace.name || "Workspace"}</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-right"><WorkspaceSession /></div>
        </header>

        <div className="content-wrap">
          <div className="welcome-row">
            <div><p className="eyebrow">Procurement workspace</p><h1>Your procurement desk</h1><p className="welcome-copy">Publish a request, review supplier proposals and retain control of every approval.</p></div>
            <button className="create-button" type="button" onClick={() => setShowCreate((value) => !value)}>＋ New request</button>
          </div>

          <section className="signal-grid" aria-label="Workspace summary">
            <article className="signal-card"><div className="signal-label">Total requests</div><div className="signal-value">{data?.requests.length ?? "—"}</div><div className="signal-foot">Saved in this workspace</div></article>
            <article className="signal-card"><div className="signal-label">In progress</div><div className="signal-value">{openCount}</div><div className="signal-foot">Open, evaluating or negotiating</div></article>
            <article className="signal-card"><div className="signal-label">Awaiting approval</div><div className="signal-value">{approvalCount}</div><div className="signal-foot">Requires an explicit human decision</div></article>
            <article className="signal-card network-signal"><div className="signal-label">Network</div><div className="network-status disconnected"><span className="network-dot pending" />NEAR testnet</div><div className="signal-foot">No transaction is submitted automatically</div></article>
          </section>

          {showCreate && <section className="activity-panel create-request-panel" id="create-request">
            <div className="panel-heading"><div><h2>Publish a procurement request</h2><p>Describe the Web3 service you need. Suppliers can respond with proposals.</p></div><button type="button" className="form-close" onClick={() => setShowCreate(false)} aria-label="Close form">×</button></div>
            <form className="procurement-form" onSubmit={createRequest}>
              <label>Request title<input name="title" minLength={5} maxLength={120} required placeholder="e.g. NEAR smart contract security audit" /></label>
              <label>Project brief<textarea name="description" minLength={20} maxLength={5000} required rows={5} placeholder="Explain the scope, expected deliverables, timeline and any relevant context." /></label>
              <div className="form-two-col"><label>Budget (smallest token unit)<input name="budgetAmount" inputMode="numeric" pattern="[0-9]*" placeholder="Optional" /></label><label>Token symbol<select name="tokenId" defaultValue="NEAR"><option value="NEAR">NEAR</option></select></label></div>
              <label>Requirements <span className="field-hint">One requirement per line</span><textarea name="requirements" rows={3} placeholder={"Relevant experience\nDelivery timeline\nSecurity documentation"} /></label>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="create-button" type="submit" disabled={saving}>{saving ? "Publishing…" : "Publish request"}</button></div>
            </form>
          </section>}

          <div className="section-heading" id="requests"><div><h2>Procurement requests</h2><p>Live records from your authenticated workspace.</p></div><button className="text-link refresh-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
          <section className="request-list" aria-label="Procurement requests">
            <div className="request-toolbar"><input aria-label="Search requests" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests…" /><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            {loading ? <p className="empty-state">Loading your procurement records…</p> : error ? <div className="empty-state error-state"><p>{error}</p><button className="secondary-button" onClick={() => void load()}>Try again</button></div> : requests.length === 0 ? <div className="empty-state"><strong>{data?.requests.length ? "No matching requests" : "Your workspace is ready"}</strong><p>{data?.requests.length ? "Change the search or status filter." : "Create your first procurement request to begin receiving supplier proposals."}</p>{!data?.requests.length && <button className="create-button" onClick={() => setShowCreate(true)}>＋ Create first request</button>}</div> : requests.map((request) => <a className="request-row live-request-row" href={`/workspace/requests/${encodeURIComponent(request.id)}`} key={request.id} aria-label={`Open ${request.title}`}>
              <div className="request-main"><span className="request-id">{shortId(request.id)}</span><strong>{request.title}</strong><span className="category">{new Date(request.created_at).toLocaleDateString()}</span></div>
              <div className="bid-count">{request.bid_count} proposals</div>
              <div className="budget">{request.budget_amount ? formatBaseUnits(request.budget_amount, request.token_id) : "Budget not set"}</div>
              <div><span className="status-pill"><i />{statusLabels[request.status] || request.status}</span></div>
              <div className="updated">{new Date(request.created_at).toLocaleDateString()}</div>
            </article>)}
          </section>
          <footer className="page-footer"><span>Alesxras coordinates. You stay in control.</span><span>Live workspace data · No sample records</span></footer>
        </div>
      </section>
    </main>
  );
}
