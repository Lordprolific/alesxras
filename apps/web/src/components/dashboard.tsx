import type { ReactNode } from "react";
import { WorkspaceSession } from "@/components/workspace-session";

const requests = [
  { id: "PR-0248", title: "Regional logistics partner", category: "Logistics", bids: 4, budget: "12,000 NEAR", status: "Reviewing bids", kind: "review", updated: "12 min ago" },
  { id: "PR-0247", title: "Secure document storage", category: "Infrastructure", bids: 3, budget: "4,800 NEAR", status: "Approval needed", kind: "approval", updated: "38 min ago" },
  { id: "PR-0246", title: "Field equipment batch 02", category: "Equipment", bids: 6, budget: "8,250 NEAR", status: "Negotiating", kind: "negotiation", updated: "1 hr ago" },
];

const activity = [
  { icon: "↗", title: "New bid received", detail: "Regional logistics partner · Bid 04", time: "12 min" },
  { icon: "✓", title: "Evaluation completed", detail: "Secure document storage · 3 suppliers", time: "38 min" },
  { icon: "◌", title: "Negotiation round opened", detail: "Field equipment batch 02 · Round 2", time: "1 hr" },
];

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" className={className}>
      <path d="M18 3 31 10.5v15L18 33 5 25.5v-15L18 3Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 10v16M10.5 14.25l15 8.5M25.5 14.25l-15 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="3" fill="currentColor" />
    </svg>
  );
}

function NavItem({ icon, children, active = false, count }: { icon: string; children: ReactNode; active?: boolean; count?: string }) {
  return <a className={`nav-item${active ? " active" : ""}`} href="#workspace"><span className="nav-icon" aria-hidden="true">{icon}</span>{children}{count && <span className={`nav-count${count === "2" ? " attention" : ""}`}>{count}</span>}</a>;
}

export function Dashboard() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Alesxras home"><BrandMark className="brand-mark" /><span>alesxras</span></a>
        <div className="workspace-switcher">
          <div className="workspace-avatar">N</div>
          <div className="workspace-name"><strong>Northstar Supply</strong><span>Procurement team</span></div>
          <span className="chevron" aria-hidden="true">⌄</span>
        </div>
        <p className="nav-heading">Workspace</p>
        <nav className="primary-nav" aria-label="Main navigation">
          <NavItem icon="◫" active>Overview</NavItem>
          <NavItem icon="▤" count="8">Procurement</NavItem>
          <NavItem icon="◇">Suppliers</NavItem>
          <NavItem icon="⌁" count="2">Approvals</NavItem>
          <NavItem icon="◷">Activity</NavItem>
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card"><span className="network-dot pending" /><div><strong>NEAR · not connected</strong><span>Wallet integration pending</span></div><span className="network-chevron" aria-hidden="true">⌄</span></div>
          <NavItem icon="⚙">Settings</NavItem>
          <div className="profile-row"><div className="profile-avatar">AM</div><div className="workspace-name"><strong>Alex Morgan</strong><span>Workspace owner</span></div><span className="chevron" aria-hidden="true">···</span></div>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Northstar Supply</span><span className="breadcrumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-right"><span className="demo-label"><span />Sample workspace</span><WorkspaceSession /><span className="mini-avatar">AM</span></div>
        </header>

        <div className="content-wrap">
          <div className="welcome-row">
            <div><p className="eyebrow">Procurement workspace</p><h1>Good morning, Alex</h1><p className="welcome-copy">Your procurement desk is moving. Here’s what needs your attention.</p></div>
            <a className="create-button" href="#create-request"><span aria-hidden="true">＋</span>New request</a>
          </div>

          <section className="signal-grid" aria-label="Workspace summary">
            <article className="signal-card"><div className="signal-label">Open requests <span className="signal-mark">↗</span></div><div className="signal-value">08</div><div className="signal-foot"><span className="trend-up">+2</span>started this week</div><div className="sparkline" aria-hidden="true"><svg viewBox="0 0 120 40"><path d="M2 31 17 26 29 29 42 15 56 20 70 11 82 18 96 8 118 4" /></svg></div></article>
            <article className="signal-card"><div className="signal-label">Awaiting your approval <span className="signal-mark">⌁</span></div><div className="signal-value">02</div><div className="signal-foot"><span className="trend-note">One is time-sensitive</span></div><div className="signal-rail"><span /></div></article>
            <article className="signal-card"><div className="signal-label">Committed this month <span className="signal-mark">◈</span></div><div className="signal-value compact">24,650 <small>NEAR</small></div><div className="signal-foot">Across 5 approved requests</div><div className="bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="signal-card network-signal"><div className="signal-label">Network <span className="signal-mark">◎</span></div><div className="network-status disconnected"><span className="network-dot pending" />Wallet not connected</div><div className="signal-foot">Testnet transactions are not enabled yet</div><div className="network-seal"><BrandMark className="brand-mark" /></div></article>
          </section>

          <div className="section-heading" id="requests"><div><h2>In motion</h2><p>Requests that need a decision or are progressing now.</p></div><a className="text-link" href="#all-requests">View all requests <span>↗</span></a></div>
          <section className="request-list" aria-label="Sample procurement requests">
            <div className="request-head"><span>Request</span><span>Supplier bids</span><span>Budget</span><span>Status</span><span>Updated</span><span /></div>
            {requests.map((request) => <article className="request-row" key={request.id}>
              <div className="request-main"><span className="request-id">{request.id}</span><strong>{request.title}</strong><span className="category">{request.category}</span></div>
              <div className="bid-count"><span className="bid-stack" aria-hidden="true"><i /><i /><i /></span>{request.bids} bids</div>
              <div className="budget">{request.budget}</div>
              <div><span className={`status-pill ${request.kind}`}><i />{request.status}</span></div>
              <div className="updated">{request.updated}</div>
              <span className="row-menu" aria-hidden="true">···</span>
            </article>)}
          </section>

          <div className="lower-grid">
            <section className="activity-panel" id="activity">
              <div className="panel-heading"><div><h2>Recent activity</h2><p>Actions across your workspace</p></div></div>
              <div className="activity-list">{activity.map((item) => <div className="activity-item" key={item.title}><span className="activity-marker">{item.icon}</span><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>)}</div>
              <a className="activity-link" href="#activity-log">Open activity log <span>↗</span></a>
            </section>
            <section className="approval-panel" id="approvals">
              <div className="panel-heading"><div><h2>Needs your decision</h2><p>Human approval before execution</p></div><span className="approval-total">02</span></div>
              <div className="approval-feature"><div className="approval-topline"><span className="status-pill approval"><i />Ready to approve</span><span className="approval-date">Due in 4h</span></div><h3>Secure document storage</h3><p>Recommended supplier <strong>Verity Systems</strong></p><div className="approval-amount"><span>Proposed amount</span><strong>4,800 <small>NEAR</small></strong></div><div className="approval-actions"><a href="#review-approval" className="review-button">Review decision</a></div></div>
              <p className="approval-footnote"><span>◎</span>Funds move only after you approve.</p>
            </section>
          </div>
          <footer className="page-footer"><span>Alesxras coordinates. You stay in control.</span><span>Sample data · No live transactions</span></footer>
        </div>
      </section>
    </main>
  );
}

