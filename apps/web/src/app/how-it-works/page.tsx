import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell, PageHero, ContentSection } from "@/components/public-pages";

export const metadata: Metadata = { title: "How It Works | Alesxras", description: "Explore the buyer, supplier, review and approval workflow in Alesxras." };

const steps = [
["01","Define the need","The buyer creates a request with a clear scope, requirements, timing and decision criteria."],
["02","Invite suppliers","Relevant suppliers are invited into the opportunity and receive the same defined brief and response window."],
["03","Submit proposals","Suppliers prepare and submit responses for the buyer's review. Production-grade encryption is not configured in this release."],
["04","Review the evidence","The buyer organises and compares the available submissions. Agent-assisted evaluation is currently illustrative, not connected to a live model provider."],
["05","Negotiate where needed","The buyer can use the structured process to clarify proposals and continue discussions with participating suppliers."],
["06","Approve as a person","An authorised buyer reviews the information and makes the supplier decision. The product does not autonomously approve a supplier."],
["07","Record the outcome","Supported network actions are designed around NEAR. The current experience is testnet-only and does not enable mainnet or real-money settlement."]
];

export default function HowItWorksPage() {
  return <PublicShell active="how"><PageHero index="03" kicker="THE WORKFLOW" title="From first brief" emphasis="to clear decision." description="A structured path for buyers and suppliers, with evidence gathered in context and final authority kept with people."/>
    <div className="workflow-list">{steps.map(([number,title,description])=><article className="workflow-step" key={number}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div><i aria-hidden="true"/></article>)}</div>
    <ContentSection number="A" title="For buyers"><p>Buyers define the requirement, invite suppliers, review responses, compare the evidence and make the final approval decision. The process is designed to keep the brief and its decision context together.</p></ContentSection>
    <ContentSection number="B" title="For suppliers"><p>Suppliers respond to a defined opportunity and provide the information requested by the buyer. The current release is not a production environment for sensitive commercial submissions.</p></ContentSection>
    <div className="content-notice"><strong>What this demonstration means</strong><p>Some workflow surfaces are illustrative. The live model-provider integration, production bid-encryption key management and mainnet settlement are not enabled. Use the workspace as a testnet product preview, not for real-money procurement.</p></div>
    <div className="content-cta"><div><span className="content-index">READY TO EXPLORE</span><h2>Enter the Alesxras workspace.</h2></div><Link className="button-primary" href="/launch">Launch app</Link></div>
  </PublicShell>;
}
