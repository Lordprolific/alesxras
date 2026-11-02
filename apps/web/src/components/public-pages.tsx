import Link from "next/link";
import type { ReactNode } from "react";

function Mark() {
  return <svg aria-hidden="true" viewBox="0 0 36 36" className="site-mark"><path d="M18 3 31 10.5v15L18 33 5 25.5v-15L18 3Z" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M18 10v16M10.5 14.25l15 8.5M25.5 14.25l-15 8.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="18" cy="18" r="2.7" fill="currentColor"/></svg>;
}

export function PublicShell({children,active}:{children:ReactNode;active:"work"|"privacy"|"how"}) {
  return <main className="public-site content-site">
    <header className="site-header"><Link href="/" className="site-brand"><Mark/><span>alesxras</span></Link><nav className="site-nav" aria-label="Main navigation"><Link className={active==="work"?"current":""} href="/work">Our work</Link><Link className={active==="how"?"current":""} href="/how-it-works">How it works</Link><Link className={active==="privacy"?"current":""} href="/privacy">Privacy</Link><Link className="nav-launch" href="/launch">Launch app</Link></nav></header>
    {children}
    <footer className="site-footer content-footer"><div className="content-footer-top"><div><Link href="/" className="site-brand footer-brand"><Mark/><span>alesxras</span></Link><p>Procurement infrastructure for a more coordinated economy.</p></div><div className="footer-columns"><div><strong>Platform</strong><Link href="/how-it-works">How it works</Link><Link href="/launch">Workspace</Link><Link href="/work">Our work</Link></div><div><strong>Information</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms of use</Link><a href="https://github.com/Lordprolific/alesxras" target="_blank" rel="noreferrer">GitHub</a><a href="https://docs.near.org/" target="_blank" rel="noreferrer">NEAR documentation</a></div></div></div><div className="footer-bottom"><span>© 2026 Alesxras</span><span>NEAR testnet experience</span><Link href="/">Back to home</Link></div></footer>
  </main>;
}

export function PageHero({index,kicker,title,emphasis,description}:{index:string;kicker:string;title:string;emphasis:string;description:string}) {
  return <section className="content-hero"><span className="content-index">{index} / {kicker}</span><h1>{title}<br/><em>{emphasis}</em></h1><p>{description}</p></section>;
}

export function ContentSection({number,title,children}:{number:string;title:string;children:ReactNode}) {
  return <section className="content-section"><span className="content-index">{number}</span><div><h2>{title}</h2><div className="content-prose">{children}</div></div></section>;
}
