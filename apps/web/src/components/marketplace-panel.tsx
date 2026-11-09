"use client";

import { useEffect, useState } from "react";

type PublicRequest = {
  id: string; title: string; description: string; requirements: string[];
  budget_amount: string | null; token_id: string; closes_at: string | null; buyerOrganization: string;
};
type OwnBid = {
  id: string; status: string; submittedAt: string | null; tokenId: string;
  requestTitle: string; buyerWorkspace: string; closesAt: string | null;
};

function date(value: string | null) {
  if (!value) return "No deadline";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date unavailable" : parsed.toLocaleDateString();
}

export function MarketplacePanel() {
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [bids, setBids] = useState<OwnBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { amount: string; proposal: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const responses = await Promise.all([
        fetch("/api/marketplace/requests", { cache: "no-store" }),
        fetch("/api/marketplace/my-bids", { cache: "no-store" }),
      ]);
      const results = await Promise.all(responses.map((response) => response.json()));
      const market = results[0] as { requests?: PublicRequest[]; error?: string };
      const own = results[1] as { bids?: OwnBid[]; error?: string };
      if (!responses[0].ok) throw new Error(market.error || "Could not load sourcing opportunities.");
      if (!responses[1].ok) throw new Error(own.error || "Could not load your proposals.");
      setRequests(market.requests || []);
      setBids(own.bids || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the marketplace.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function submit(requestId: string) {
    const draft = drafts[requestId];
    if (!draft) return;
    setSubmitting(requestId); setError(""); setMessage("");
    try {
      const response = await fetch("/api/marketplace/requests/" + encodeURIComponent(requestId) + "/bids", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Proposal could not be submitted.");
      setMessage("Your sealed proposal was submitted. The buyer can review it from the procurement record.");
      setDrafts((current) => ({ ...current, [requestId]: { amount: "", proposal: "" } }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proposal could not be submitted.");
    } finally { setSubmitting(null); }
  }

  return <section className="marketplace-panel" id="discover">
    <div className="marketplace-heading"><div><p className="eyebrow">Supplier marketplace</p><h2>Discover opportunities</h2><p>Explore public procurement requests and respond with a sealed proposal.</p></div><button type="button" className="text-link" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {message && <p className="marketplace-message success" role="status">{message}</p>}
    {error && <p className="marketplace-message error" role="alert">{error}</p>}
    <div className="marketplace-grid">
      <div className="marketplace-opportunities">
        {loading ? <p className="empty-state">Loading public opportunities…</p> : requests.length === 0 ? <div className="empty-state"><strong>No public requests yet</strong><p>When buyers publish opportunities, they will appear here.</p></div> : requests.map((item) => {
          const draft = drafts[item.id] || { amount: "", proposal: "" };
          const alreadyBid = bids.some((bid) => bid.requestTitle === item.title && bid.buyerWorkspace === item.buyerOrganization);
          return <article className="marketplace-request" key={item.id}>
            <div className="marketplace-request-top"><span>{item.buyerOrganization}</span><span>{date(item.closes_at)}</span></div>
            <h3>{item.title}</h3><p>{item.description}</p>
            <div className="marketplace-request-meta"><span>{item.budget_amount ? "Budget available · " + item.token_id : "Budget not disclosed"}</span><span>{item.requirements?.length || 0} requirements</span></div>
            {item.requirements?.length > 0 && <ul>{item.requirements.slice(0, 5).map((requirement, index) => <li key={index}>{requirement}</li>)}</ul>}
            {alreadyBid ? <p className="marketplace-submitted">Your workspace has submitted a proposal for this request.</p> : <form className="marketplace-bid-form" onSubmit={(event) => { event.preventDefault(); void submit(item.id); }}>
              <label>Bid amount (smallest token unit)<input inputMode="numeric" pattern="[0-9]*" value={draft.amount} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, amount: event.target.value } }))} required placeholder="Enter your amount" /></label>
              <label>Proposal<textarea minLength={30} maxLength={5000} rows={3} value={draft.proposal} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, proposal: event.target.value } }))} required placeholder="Explain your approach, experience and delivery plan." /></label>
              <button className="create-button" type="submit" disabled={submitting === item.id}>{submitting === item.id ? "Submitting securely…" : "Submit sealed proposal"}</button>
            </form>}
          </article>;
        })}
      </div>
      <aside className="marketplace-my-bids"><div><h3>My proposals</h3><span>{bids.length} submitted</span></div>
        {bids.length === 0 ? <p className="empty-state">Your submitted proposals will appear here.</p> : bids.map((bid) => <article className="marketplace-own-bid" key={bid.id}><strong>{bid.requestTitle}</strong><span>{bid.buyerWorkspace}</span><small>{bid.status} · {date(bid.submittedAt)}</small></article>)}
      </aside>
    </div>
  </section>;
}
