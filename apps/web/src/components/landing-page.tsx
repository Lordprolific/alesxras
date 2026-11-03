"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";

const stages = [
  { title: "Define the need", eyebrow: "01 · Buyer", detail: "A buyer creates a scoped request with requirements, timing, and a budget range. The brief stays private to the invited network.", cue: "Request · RQ-2048", status: "Private brief" },
  { title: "Invite suppliers", eyebrow: "02 · Network", detail: "The buyer invites relevant suppliers to respond. Each supplier sees the same request and submission window.", cue: "Invitations · 6 sent", status: "Window open" },
  { title: "Collect confidential bids", eyebrow: "03 · Suppliers", detail: "Suppliers submit proposals privately. The public demonstration never reveals bid amounts or supplier-sensitive terms.", cue: "Submissions · sealed", status: "Confidential" },
  { title: "Evaluate the evidence", eyebrow: "04 · Agents", detail: "Bounded agents can organise supplied evidence against the buyer’s criteria. A recommendation is a decision aid, not an approval.", cue: "Evidence · 4 criteria", status: "Human review" },
  { title: "Compare and negotiate", eyebrow: "05 · Buyer + supplier", detail: "The buyer reviews a side-by-side assessment and can open a structured negotiation round with participating suppliers.", cue: "Round · 02", status: "Buyer-led" },
  { title: "Approve the choice", eyebrow: "06 · Human control", detail: "A named buyer reviews the recommendation and explicitly approves a supplier before any settlement action can proceed.", cue: "Approval · required", status: "No auto-approval" },
  { title: "Record the outcome", eyebrow: "07 · NEAR testnet", detail: "Where enabled, transaction actions can be submitted to NEAR testnet and checked against their on-chain receipts. Mainnet settlement is not enabled.", cue: "Network · testnet", status: "Illustrative flow" },
];

function Mark({ light = false }: { light?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 36 36" className={`site-mark${light ? " light" : ""}`}><path d="M18 3 31 10.5v15L18 33 5 25.5v-15L18 3Z" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M18 10v16M10.5 14.25l15 8.5M25.5 14.25l-15 8.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="18" cy="18" r="2.7" fill="currentColor"/></svg>;
}

function NetworkArtwork() {
  const artRef = useRef<HTMLDivElement>(null);
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--pointer-x", String(x));
    event.currentTarget.style.setProperty("--pointer-y", String(y));
  };
  const resetPointer = () => {
    artRef.current?.style.setProperty("--pointer-x", "0");
    artRef.current?.style.setProperty("--pointer-y", "0");
  };
  return <div ref={artRef} onPointerMove={handlePointerMove} onPointerLeave={resetPointer} className="network-art" aria-label="Animated illustration of buyers, suppliers and agents coordinating a procurement request" role="img">
    <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-orbit orbit-three"/>
    <svg className="art-lines" viewBox="0 0 660 560" fill="none" aria-hidden="true">
      <path className="flow flow-one" d="M104 294C174 294 157 126 275 126S380 280 494 280"/><path className="flow flow-two" d="M110 294C202 294 183 428 302 428S380 280 494 280"/><path className="flow flow-three" d="M275 126C340 126 331 280 494 280M302 428C365 428 356 280 494 280"/><path className="flow fine" d="M104 294H494"/>
      <circle className="pulse-dot pulse-a" r="4"><animateMotion dur="6s" repeatCount="indefinite" path="M104 294C174 294 157 126 275 126S380 280 494 280"/></circle>
      <circle className="pulse-dot pulse-b" r="4"><animateMotion dur="7.2s" begin="1s" repeatCount="indefinite" path="M110 294C202 294 183 428 302 428S380 280 494 280"/></circle>
      <circle className="pulse-dot pulse-c" r="3"><animateMotion dur="5.6s" begin="2.2s" repeatCount="indefinite" path="M275 126C340 126 331 280 494 280"/></circle>
    </svg>
    <div className="art-center"><div className="center-halo"/><Mark light/><span>alesxras</span></div>
    
  </div>;
}

function LifecycleDemo() {
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const stage = stages[active];
  return <div className="lifecycle-demo" onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current === null) return; const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 48) setActive((current) => Math.min(stages.length - 1, Math.max(0, current + (delta < 0 ? 1 : -1)))); touchStart.current = null; }}>
    <div className="lifecycle-rail" role="tablist" aria-label="Procurement lifecycle stages">
      {stages.map((item, index) => <button className={`stage-tab${active === index ? " selected" : ""}`} key={item.title} onClick={() => setActive(index)} role="tab" aria-selected={active === index} aria-controls="stage-detail" id={`stage-tab-${index}`}>
        <span className="stage-number">{String(index + 1).padStart(2, "0")}</span><span className="stage-tab-title">{item.title}</span><span className="stage-connector"/>
      </button>)}
    </div>
    <div className="stage-window" id="stage-detail" role="tabpanel" aria-labelledby={`stage-tab-${active}`} key={active}>
      <div className="stage-window-top"><span className="window-brand"><Mark/>Alesxras workspace</span><span className="testnet-tag"><i/>NEAR TESTNET</span></div>
      <div className="stage-window-body">
        <div className="window-copy"><p className="stage-eyebrow">{stage.eyebrow}</p><h3>{stage.title}</h3><p>{stage.detail}</p><span className="stage-status"><i/>{stage.status}</span></div>
        <div className={`procurement-art stage-${active}`} aria-hidden="true">
          <div className="brief-sheet"><div className="sheet-top"><Mark/><span>{stage.cue}</span></div><i className="sheet-line long"/><i className="sheet-line"/><i className="sheet-line short"/><div className="sheet-rule"/><div className="sheet-footer"><span>Scope defined</span><span className="sheet-lock">⌑</span></div></div>
          <div className="orbit-ring ring-a"/><div className="orbit-ring ring-b"/><span className="process-node p-buyer">B</span><span className="process-node p-agent">A</span><span className="process-node p-supplier">S</span><span className="process-node p-chain">N</span><div className="process-thread thread-a"/><div className="process-thread thread-b"/><div className="process-thread thread-c"/>
        </div>
      </div>
      <div className="stage-window-foot"><span>Private by design</span><span>{String(active + 1).padStart(2, "0")} / 07</span></div>
    </div>
  </div>;
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const progressRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.documentElement;
        const range = root.scrollHeight - window.innerHeight;
        const progress = range > 0 ? window.scrollY / range : 0;
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
      });
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    if (reducedMotion || !("IntersectionObserver" in window)) {
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", updateProgress);
        window.removeEventListener("resize", updateProgress);
      };
    }
    const sections = document.querySelectorAll<HTMLElement>(".public-site > section:not(.hero-section):not(.closing-section)");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-revealed", entry.isIntersecting);
      }
    }, { threshold: 0.14, rootMargin: "0px 0px -36px 0px" });
    sections.forEach((section) => {
      section.classList.add("site-reveal");
      observer.observe(section);
    });
    document.documentElement.classList.add("has-scroll-reveals");
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      observer.disconnect();
      document.documentElement.classList.remove("has-scroll-reveals");
    };
  }, []);
  return <main className="public-site"><div className="scroll-progress" aria-hidden="true"><span ref={progressRef} /></div>
    <header className="site-header"><Link href="/" className="site-brand" aria-label="Alesxras home"><Mark/><span>alesxras</span></Link><button className="mobile-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span/><span/></button><nav className={`site-nav${menuOpen ? " open" : ""}`} aria-label="Main navigation"><a href="#network" onClick={() => setMenuOpen(false)}>The network</a><Link href="/how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link><Link href="/work" onClick={() => setMenuOpen(false)}>Our work</Link><Link href="/privacy" onClick={() => setMenuOpen(false)}>Privacy</Link><Link className="nav-launch" href="/launch">Launch app</Link></nav></header>

    <section className="hero-section" id="top"><div className="hero-copy"><h1>Business moves<br/>when <em>trust</em> moves.</h1><p className="hero-lede">A private procurement network where buyers, suppliers and intelligent agents move from brief to decision | with people firmly in control.</p><div className="hero-actions"><Link className="button-primary" href="/launch">Launch app</Link><a className="button-secondary" href="#network">Explore the network <span>↓</span></a></div><p className="hero-note"><span className="testnet-pip"/>Built for business on NEAR <span className="note-divider"/> Testnet experience</p></div><NetworkArtwork/><div className="hero-index"><span>01</span><span className="index-line"/><span>07</span></div><a className="scroll-cue" href="#network" aria-label="Scroll to explore"><span>SCROLL TO EXPLORE</span><i /></a></section>

    <section className="intro-section" id="network"><div className="section-side"><span className="section-index">01 / THE NETWORK</span><p>Infrastructure for consequential decisions.</p></div><div className="intro-main"><h2>Procurement is a network problem. <span>Now it can work like one.</span></h2><p>Good sourcing depends on the right people sharing the right information at the right moment. Alesxras brings those relationships into one coordinated environment | so the work moves forward without losing sight of who decides.</p></div></section>

    <section className="lifecycle-section" id="lifecycle"><div className="section-heading-row"><div><span className="section-index">02 / FROM BRIEF TO OUTCOME</span><h2>A clear path through<br/>complex decisions.</h2></div><p>Select a stage to see what happens.<br/>Every bid shown is illustrative.</p></div><LifecycleDemo/></section>

    <section className="privacy-section" id="principles"><div className="privacy-visual"><div className="privacy-orbit po-1"/><div className="privacy-orbit po-2"/><div className="privacy-lock"><svg viewBox="0 0 56 56" fill="none" aria-hidden="true"><path d="M16 25v-7a12 12 0 0 1 24 0v7M12 25h32v23H12z" stroke="currentColor" strokeWidth="1.5"/><circle cx="28" cy="35" r="3" fill="currentColor"/><path d="M28 38v5" stroke="currentColor" strokeWidth="1.5"/></svg></div><div className="privacy-annotation annotation-top">INVITATION ONLY</div><div className="privacy-annotation annotation-bottom">SEALED SUBMISSIONS</div><div className="privacy-link link-top"/><div className="privacy-link link-bottom"/></div><div className="privacy-copy"><span className="section-index">03 / CONFIDENTIALITY</span><h2>Share the brief.<br/><em>Keep the leverage.</em></h2><p>Procurement details can reveal more than a price. Alesxras is designed around private requests and confidential supplier submissions, keeping bid values out of public demonstrations and buyer decisions in the right hands.</p><p className="capability-note"><span className="note-bar"/>Application-level bid encryption is a design goal; production key management is not configured in this release.</p><a href="#lifecycle" className="text-cta">See the private lifecycle</a></div></section>

    <section className="intelligence-section"><div className="intelligence-head"><div><span className="section-index">04 / AGENT-ASSISTED, HUMAN-LED</span><h2>Useful intelligence.<br/><span>Bounded authority.</span></h2></div><p>Agents can help organise the evidence.<br/>They do not get to decide the outcome.</p></div><div className="intelligence-flow"><div className="evidence-source"><span className="flow-symbol"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.75h8l4 4V20.25H6zM14 3.75v4h4M9 12h6M9 15.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><strong>Supplier evidence</strong><small>Submitted materials</small></div><div className="flow-link"><i/><i/><i/></div><div className="agent-core"><div className="agent-orbit-small"/><span className="agent-spark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9zM19 15l1 2.5 2 1-2 1-1 2.5-1-2.5-2-1 2-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg></span><strong>Evaluation agent</strong><small>Criteria · evidence · rationale</small></div><div className="flow-link"><i/><i/><i/></div><div className="recommendation"><span className="recommendation-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12.5 4.5 4L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span><strong>Recommendation</strong><small>Ready for buyer review</small></div><div className="human-gate"><span className="gate-line"/><span className="gate-dot"/><div><span>FINAL AUTHORITY</span><strong>Buyer approval</strong></div></div></div><p className="illustrative-caption">Illustrative workflow · agent evaluation capabilities are not yet connected to a live model provider.</p></section>

    <section className="participants-section"><div className="participants-intro"><span className="section-index">05 / A SHARED ENVIRONMENT</span><h2>Different roles.<br/>One considered process.</h2></div><article className="participant buyer-card"><div className="participant-top"><span className="participant-glyph buyer-glyph">B</span><span>01</span></div><h3>For buyers</h3><p>Shape a clear brief, compare submissions side by side, and keep approval in the hands of accountable people.</p><a href="#lifecycle">Buyer journey</a></article><article className="participant supplier-card"><div className="participant-top"><span className="participant-glyph supplier-glyph">S</span><span>02</span></div><h3>For suppliers</h3><p>Respond to a defined opportunity and take part in a structured process where submissions remain confidential.</p><a href="#lifecycle">Supplier journey</a></article></section>

    <section className="near-section"><div className="near-left"><span className="section-index">06 / BUILT WITH NEAR IN MIND</span><h2>Coordination off-chain.<br/><span>Proof where it counts.</span></h2><p>Alesxras is designed for business transactions on NEAR. Supported chain interactions belong at the point of settlement and record | not as decoration on every step.</p><span className="network-warning"><i/>CURRENT EXPERIENCE: NEAR TESTNET</span></div><div className="near-graphic" aria-label="A procurement record prepared for a testnet transaction"><div className="near-disc disc-back"/><div className="near-disc disc-front"><Mark light/><span>NEAR</span></div><div className="chain-node cn-one"><span>01</span><strong>Buyer approval</strong></div><div className="chain-node cn-two"><span>02</span><strong>Signed action</strong></div><div className="chain-node cn-three"><span>03</span><strong>Receipt check</strong></div><svg viewBox="0 0 580 320" className="near-path" aria-hidden="true"><path d="M104 75C205 75 198 245 292 245s85-170 185-170"/><path d="M104 75C185 75 211 160 292 160s105-85 185-85"/><path d="M104 75H477"/></svg><span className="near-footnote">Testnet only · no real-money settlement</span></div></section>

    <section className="approval-section"><div className="approval-glyph"><div className="approval-ring ring-one"/><div className="approval-ring ring-two"/><span>YOU</span></div><div className="approval-copy"><span className="section-index">07 / CONTROL THAT STAYS HUMAN</span><h2>Automation can move work.<br/><em>Only people move decisions.</em></h2><p>Agent assistance can narrow the search and explain a recommendation. A buyer still reviews the evidence and approves the supplier. Signing keys stay outside agents and web requests.</p></div><div className="approval-seal"><span>NO</span><strong>AUTO<br/>APPROVAL</strong></div></section>

    <section className="closing-section"><div className="closing-backdrop"/><Mark light/><p>Private by design. Human by decision.</p><h2>Make the next<br/>business decision<br/><em>move with trust.</em></h2><Link href="/launch" className="button-light">Launch app</Link><span className="closing-testnet"><i/>NEAR TESTNET EXPERIENCE</span></section>

    <footer className="site-footer"><Link href="/" className="site-brand footer-brand"><Mark/><span>alesxras</span></Link><p>Procurement infrastructure for a more coordinated economy.</p><div className="footer-columns"><div><strong>Platform</strong><a href="#network">The network</a><Link href="/how-it-works">How it works</Link><Link href="/work">Our work</Link><Link href="/launch">Launch workspace</Link></div><div><strong>Information</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms of use</Link><a href="https://github.com/Lordprolific/alesxras" target="_blank" rel="noreferrer">GitHub</a><a href="https://docs.near.org/" target="_blank" rel="noreferrer">NEAR documentation</a></div></div><div className="footer-bottom"><span>© 2026 Alesxras</span><span>Built for NEAR · Testnet</span><a href="#top">Back to top</a></div></footer>
  </main>;
}
