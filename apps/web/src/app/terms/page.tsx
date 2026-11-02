import type { Metadata } from "next";
import { PublicShell, PageHero, ContentSection } from "@/components/public-pages";

export const metadata: Metadata = { title: "Terms of Use | Alesxras", description: "Terms for accessing the Alesxras testnet product preview." };

export default function TermsPage() {
  return <PublicShell active="privacy"><PageHero index="04" kicker="TERMS OF USE" title="A product preview" emphasis="with clear limits." description="These preliminary terms explain the intended use of the current Alesxras testnet experience. They require legal review before production launch."/>
    <div className="content-notice"><strong>Important</strong><p>This page is a preliminary product disclosure, not a lawyer-reviewed agreement. It should be reviewed and completed with the operating entity, governing law, contact details and final service terms before the platform is opened for production use.</p></div>
    <ContentSection number="01" title="Testnet-only access"><p>The current Alesxras experience is provided for demonstration, testing and feedback. It is not a production procurement or payment service. Do not use real funds, submit live commercial commitments or rely on the demonstration for time-sensitive business decisions.</p></ContentSection>
    <ContentSection number="02" title="Accounts and wallet safety"><p>You are responsible for the security of your account, connected wallet and devices. Never share a recovery phrase, private key or password. Wallet actions should be reviewed in the wallet interface before signing.</p></ContentSection>
    <ContentSection number="03" title="Illustrative functionality"><p>Some screens, records, workflow diagrams and sample activity are illustrative. The public workspace may contain sample data. Live agent evaluation, production bid-encryption key management and mainnet settlement are not enabled in this release.</p></ContentSection>
    <ContentSection number="04" title="Acceptable use"><p>Do not attempt to disrupt the service, bypass access controls, access another participant&apos;s information without authorisation, upload malicious content or use the product for unlawful activity.</p></ContentSection>
    <ContentSection number="05" title="No financial or procurement advice"><p>Information displayed by the product is provided to support workflow testing. It is not financial, legal, procurement or investment advice, and no supplier recommendation should be treated as an approval or guarantee.</p></ContentSection>
    <ContentSection number="06" title="Availability and changes"><p>The preview may change, be interrupted or be withdrawn as development continues. Production availability, support commitments, liability terms, dispute procedures and governing law will be specified in a reviewed agreement before production launch.</p></ContentSection>
    <div className="content-endnote"><span>Last updated · 2 November 2026</span><span>Preliminary testnet terms · legal review required</span></div>
  </PublicShell>;
}
