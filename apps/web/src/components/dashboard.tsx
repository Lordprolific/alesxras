"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { WorkspaceSession } from "@/components/workspace-session";
import { MarketplacePanel } from "@/components/marketplace-panel";

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

type AgentRun = {
  id: string;
  procurement_id: string | null;
  kind: "evaluate_procurement" | "negotiate_bid" | "verify_transaction";
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  step_count: number;
  created_at: string;
  result?: unknown;
  error_message?: string | null;
};

type UserProfile = {
  accountId: string;
  displayName: string;
  avatarIcon: string;
};

const profileIcons = [
  { id: "spark", glyph: "✦", label: "Spark" },
  { id: "orbit", glyph: "◉", label: "Orbit" },
  { id: "diamond", glyph: "◆", label: "Diamond" },
  { id: "sun", glyph: "☼", label: "Sun" },
  { id: "flower", glyph: "❋", label: "Flower" },
  { id: "leaf", glyph: "❧", label: "Leaf" },
  { id: "moon", glyph: "☾", label: "Moon" },
  { id: "wave", glyph: "〰", label: "Wave" },
];

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
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [agentRunsLoading, setAgentRunsLoading] = useState(true);
  const [agentRunKind, setAgentRunKind] = useState<AgentRun["kind"]>("evaluate_procurement");
  const [agentRequestId, setAgentRequestId] = useState("");
  const [agentQueueing, setAgentQueueing] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");
  const [agentError, setAgentError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("spark");
  const [profileSaving, setProfileSaving] = useState(false);

  async function loadAgentRuns() {
    setAgentRunsLoading(true);
    try {
      const response = await fetch("/api/workspace/agent-runs", { cache: "no-store" });
      const result = await response.json() as { runs?: AgentRun[] };
      if (!response.ok) throw new Error("Could not load agent activity.");
      setAgentRuns(result.runs ?? []);
    } catch (cause) {
      setAgentError(cause instanceof Error ? cause.message : "Could not load agent activity.");
    } finally {
      setAgentRunsLoading(false);
    }
  }

  async function queueAgentRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agentRequestId) {
      setAgentError("Choose a procurement request first.");
      return;
    }
    setAgentQueueing(true);
    setAgentError("");
    setAgentMessage("");
    try {
      const response = await fetch("/api/workspace/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: agentRunKind, procurementId: agentRequestId }),
      });
      const result = await response.json() as { error?: string; run?: AgentRun };
      if (!response.ok || !result.run) throw new Error(result.error || "The agent task could not be recorded.");
      setAgentMessage("Evaluation queued. The report will appear here once the AI Gateway key is configured for this preview.");
      await loadAgentRuns();
    } catch (cause) {
      setAgentError(cause instanceof Error ? cause.message : "The agent task could not be recorded.");
    } finally {
      setAgentQueueing(false);
    }
  }

  async function loadProfile() {
    setProfileLoading(true);
    setProfileError("");
    try {
      const response = await fetch("/api/workspace/profile", { cache: "no-store" });
      const result = await response.json() as { profile?: UserProfile; error?: string };
      if (!response.ok || !result.profile) throw new Error(result.error || "Could not load your profile.");
      setProfile(result.profile);
      setSelectedIcon(result.profile.avatarIcon);
      setProfileDialogOpen(!result.profile.displayName || result.profile.displayName === result.profile.accountId);
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Could not load your profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") || "").trim();
    if (displayName.length < 2 || displayName.length > 40) {
      setProfileError("Your name must be between 2 and 40 characters.");
      return;
    }
    setProfileSaving(true);
    setProfileError("");
    try {
      const response = await fetch("/api/workspace/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarIcon: selectedIcon }),
      });
      const result = await response.json() as { profile?: UserProfile; error?: string };
      if (!response.ok || !result.profile) throw new Error(result.error || "Your profile could not be saved.");
      setProfile(result.profile);
      setProfileDialogOpen(false);
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "Your profile could not be saved.");
    } finally {
      setProfileSaving(false);
    }
  }

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
  useEffect(() => { void loadAgentRuns(); }, []);
  useEffect(() => { void loadProfile(); }, []);

  const requests = useMemo(() => (data?.requests ?? []).filter((item) => {
    const matchesSearch = `${item.title} ${item.description} ${shortId(item.id)}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (status === "all" || item.status === status);
  }), [data, search, status]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError("");
    const form = new FormData(formElement);
    const requirements = String(form.get("requirements") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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
          <a className="nav-item" href="#discover">Discover requests</a>
          <a className="nav-item" href="#agents">Agent operations</a>
          <a className="nav-item" href="#requests">Procurement</a>
          <a className="nav-item" href="#create-request" onClick={() => setShowCreate(true)}>New request</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card"><span className="network-dot pending" /><div><strong>NEAR testnet</strong><span>Human approval required</span></div></div>
          <button className="profile-row profile-sidebar-button" type="button" onClick={() => { setSelectedIcon(profile?.avatarIcon || "spark"); setProfileDialogOpen(true); }}>
            <span className="profile-avatar">{profileIcons.find((item) => item.id === profile?.avatarIcon)?.glyph || "✦"}</span>
            <span className="workspace-name"><strong>{profile?.displayName || "Set up your profile"}</strong><span>{data?.workspace.accountId || "Verified wallet"}</span></span>
          </button>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>{data?.workspace.name || "Workspace"}</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-right">
            <button className="profile-trigger" type="button" aria-label="Edit your profile" title="Edit your profile" onClick={() => { setSelectedIcon(profile?.avatarIcon || "spark"); setProfileDialogOpen(true); }} disabled={profileLoading}>
              <span className="profile-trigger-avatar">{profileIcons.find((item) => item.id === profile?.avatarIcon)?.glyph || "✦"}</span>
              <span>{profile?.displayName || "Your profile"}</span>
            </button>
            <WorkspaceSession />
          </div>
        </header>

        <div className="content-wrap">
          <div className="welcome-row">
            <div><p className="eyebrow">Procurement workspace</p><h1>{profile?.displayName ? `Good morning, ${profile.displayName}` : "Your procurement desk"}</h1><p className="welcome-copy">Publish a request, review supplier proposals and retain control of every approval.</p></div>
            <button className="create-button" type="button" onClick={() => setShowCreate((value) => !value)}>＋ New request</button>
          </div>

          <section className="signal-grid" aria-label="Workspace summary">
            <article className="signal-card"><div className="signal-label">Total requests</div><div className="signal-value">{data?.requests.length ?? "—"}</div><div className="signal-foot">Saved in this workspace</div></article>
            <article className="signal-card"><div className="signal-label">In progress</div><div className="signal-value">{openCount}</div><div className="signal-foot">Open, evaluating or negotiating</div></article>
            <article className="signal-card"><div className="signal-label">Awaiting approval</div><div className="signal-value">{approvalCount}</div><div className="signal-foot">Requires an explicit human decision</div></article>
            <article className="signal-card network-signal"><div className="signal-label">Network</div><div className="network-status disconnected"><span className="network-dot pending" />NEAR testnet</div><div className="signal-foot">No transaction is submitted automatically</div></article>
          </section>

          <MarketplacePanel />

          <section className="activity-panel agent-command-panel" id="agents">
            <div className="panel-heading"><div><p className="eyebrow">Autonomous operations</p><h2>Agent operations</h2><p>Coordinate procurement work through bounded agent tasks, with people retaining approval authority.</p></div><span className="agent-foundation-tag">Orchestration foundation</span></div>
            <div className="agent-role-grid">
              <article className="agent-role-card"><span className="agent-role-index">01</span><h3>Discovery agent</h3><p>Finds relevant sourcing opportunities and maps requirements to potential suppliers.</p><span>Opportunity research</span></article>
              <article className="agent-role-card"><span className="agent-role-index">02</span><h3>Supplier agent</h3><p>Helps suppliers interpret briefs and prepare responses within owner-defined limits.</p><span>Proposal preparation</span></article>
              <article className="agent-role-card"><span className="agent-role-index">03</span><h3>Evaluation agent</h3><p>Reviews procurement evidence and prepares structured comparisons for human review.</p><span>Evaluation workflow</span></article>
              <article className="agent-role-card"><span className="agent-role-index">04</span><h3>Negotiation agent</h3><p>Coordinates permitted negotiation steps without exceeding approved boundaries.</p><span>Negotiation workflow</span></article>
              <article className="agent-role-card"><span className="agent-role-index">05</span><h3>Verification agent</h3><p>Checks execution evidence and transaction conditions before a human-authorized action.</p><span>Verification workflow</span></article>
            </div>
            <div className="agent-workbench">
              <div className="agent-workbench-copy"><p className="eyebrow">Task orchestration</p><h3>Prepare an agent task</h3><p>Choose the workflow and procurement record. This preview records a bounded task request; it does not call an AI provider, submit a transaction or execute an agent.</p></div>
              <form className="agent-task-form" onSubmit={queueAgentRun}>
                <label>Agent workflow<select value={agentRunKind} onChange={(event) => setAgentRunKind(event.target.value as AgentRun["kind"])}><option value="evaluate_procurement">Evaluate procurement</option><option value="negotiate_bid" disabled>Prepare negotiation · coming later</option><option value="verify_transaction" disabled>Verify transaction · coming later</option></select></label>
                <label>Procurement request<select value={agentRequestId} onChange={(event) => setAgentRequestId(event.target.value)} required><option value="">Choose a request</option>{(data?.requests ?? []).map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
                <button className="create-button" type="submit" disabled={agentQueueing || !agentRequestId || !data?.requests.length}>{agentQueueing ? "Recording task…" : "Record agent task"}</button>
              </form>
            </div>
            {agentMessage && <p className="agent-feedback success" role="status">{agentMessage}</p>}
            {agentError && <p className="agent-feedback error" role="alert">{agentError}</p>}
            <div className="agent-runs-heading"><div><h3>Recent agent activity</h3><p>Persisted task records for this workspace</p></div><button className="text-link refresh-button" type="button" onClick={() => void loadAgentRuns()} disabled={agentRunsLoading}>Refresh</button></div>
            <div className="agent-run-list">{agentRunsLoading ? <p className="empty-state">Loading agent activity…</p> : agentRuns.length === 0 ? <p className="empty-state">No agent tasks have been recorded yet.</p> : agentRuns.map((run) => <article className="agent-run-entry" key={run.id}><div className="agent-run-row"><div><strong>{run.kind.replaceAll("_", " ")}</strong><span>{run.procurement_id ? shortId(run.procurement_id) : "Workspace task"} · {new Date(run.created_at).toLocaleString()}</span></div><span className={"agent-run-status " + run.status}>{run.status}</span></div>{run.result != null && <details className="agent-run-result"><summary>View agent report</summary><pre>{JSON.stringify(run.result, null, 2)}</pre></details>}{run.error_message && <p className="agent-run-error">{run.error_message}</p>}</article>)}</div>
            <p className="agent-safety-note">The evaluation agent can prepare evidence-based reports when the AI Gateway key is configured. Negotiation and transaction verification remain disabled until secure bid review and NEAR transaction evidence are connected. Human approval is always required.</p>
          </section>

          {showCreate && <section className="activity-panel create-request-panel" id="create-request">
            <div className="panel-heading"><div><h2>Publish a procurement request</h2><p>Publish to the supplier marketplace. Verified workspaces can discover the brief and submit sealed proposals.</p></div><button type="button" className="form-close" onClick={() => setShowCreate(false)} aria-label="Close form">×</button></div>
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
            </a>)}
          </section>
          <footer className="page-footer"><span>Alesxras coordinates. You stay in control.</span><span>Live workspace data · No sample records</span></footer>
        </div>

        {profileDialogOpen && !profileLoading && <div className="profile-dialog-backdrop" role="presentation">
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
            <div className="profile-dialog-heading">
              <p className="eyebrow">{profile ? "Your account" : "A quick introduction"}</p>
              <h2 id="profile-dialog-title">{profile ? "Personalize your profile" : "What should we call you?"}</h2>
              <p>{profile ? "Choose the name and icon that appear across your workspace." : "Let's make this workspace yours. Your name will appear in your dashboard greeting."}</p>
            </div>
            <form onSubmit={saveProfile} className="profile-form">
              <label className="profile-name-field">Your name
                <input name="displayName" defaultValue={profile?.displayName === profile?.accountId ? "" : profile?.displayName || ""} minLength={2} maxLength={40} autoComplete="name" autoFocus required placeholder="Enter your name" />
              </label>
              <fieldset className="profile-icon-field">
                <legend>Choose your profile icon</legend>
                <div className="profile-icon-grid">
                  {profileIcons.map((icon) => <label className={selectedIcon === icon.id ? "profile-icon-option selected" : "profile-icon-option"} key={icon.id}>
                    <input type="radio" name="avatarIcon" value={icon.id} checked={selectedIcon === icon.id} onChange={() => setSelectedIcon(icon.id)} />
                    <span aria-hidden="true">{icon.glyph}</span><small>{icon.label}</small>
                  </label>)}
                </div>
              </fieldset>
              {profileError && <p className="profile-form-error" role="alert">{profileError}</p>}
              <div className="profile-form-actions">
                {profile && <button type="button" className="secondary-button" onClick={() => { setProfileError(""); setProfileDialogOpen(false); }}>Cancel</button>}
                <button type="submit" className="create-button" disabled={profileSaving}>{profileSaving ? "Saving profile…" : profile ? "Save changes" : "Continue to dashboard"}</button>
              </div>
            </form>
          </section>
        </div>}
        {profileError && !profileDialogOpen && <p className="profile-load-error" role="alert">{profileError}</p>}
      </section>
    </main>
  );
}
