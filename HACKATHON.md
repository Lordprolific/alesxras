# NEAR HACKATHON — Alesxras project notes

This file records the project-specific build status and submission checklist. For official dates, tracks, rules, and submission instructions, always check https://nearhackathon.com/ and the organizer's latest instructions.

## Project

- **Name:** Alesxras
- **Repository:** https://github.com/Lordprolific/alesxras
- **Production demo:** https://thealesxras.vercel.app/
- **Primary track fit:** Autonomous Business — procurement workflows with bounded AI assistance and human-defined approval boundaries.

## What the prototype currently demonstrates

1. A workspace connects through the NEAR wallet-selector-based identity flow.
2. A buyer workspace publishes a procurement request.
3. A supplier workspace discovers a public request and submits a sealed proposal.
4. The buyer runs a procurement evaluation agent. The worker calls Google Gemini and stores structured results.
5. The buyer runs a negotiation preparation agent. It prepares objectives, clarification questions, guardrails, and next steps from the brief and non-sensitive proposal metadata.
6. The transaction verification workflow can inspect a real, previously recorded NEAR transaction hash. It must not be described as a payment execution feature.

The repository and production database have evidence of a successful procurement evaluation. Negotiation preparation and successful payment verification still require separate end-to-end tests. Do not claim those tests passed until a real run has been inspected.

## NEAR integration — accurate status

Implemented in the current codebase:
- NEAR Wallet Selector dependencies for wallet connection/account identity.
- A NEAR gateway interface and transfer data types.
- A testnet-only network guard with a unit test that rejects mainnet.
- NEAR RPC transaction lookup in the verification workflow.

Not implemented as live integrations:
- A concrete NEAR transfer signer or deployed procurement smart contract.
- A complete testnet transaction submission and settlement path.
- NEAR Intents integration (quotes, deposits, signed intents, execution, status/settlement).
- Chain Signatures / MPC signing.
- NEAR AI Cloud. Agent inference currently uses Google Gemini directly.
- Autonomous agent treasury or payment execution.

Do not add NEAR Intents, Chain Signatures, NEAR AI Cloud, or smart-contract claims to the demo or submission unless those integrations are actually implemented and tested.

## Recommended demo run

Use two workspaces if available so the supplier and buyer actions are visibly distinct.

1. Open the production app and show the workspace connection.
2. Show the buyer's procurement request and explain its requirements.
3. Switch to a supplier workspace and submit a sealed proposal. Do not reveal or display encrypted bid contents as plaintext.
4. Return to the buyer workspace and run **Evaluate procurement**.
5. Open the saved agent result and show its criteria, missing information, risk flags, and next steps.
6. Run **Prepare negotiation brief** and show the generated objectives, clarification questions, guardrails, and next steps.
7. If showing **Verify NEAR transaction**, use a genuine recorded transaction hash and explain exactly what was checked. If there is no real transaction, show the `insufficient_evidence` result and explain that payment execution is not part of the current prototype.
8. Close by emphasizing the human approval boundary: agents assist with analysis; they do not independently approve or sign payments.

Record the real production UI. Do not edit the recording to imply a failed workflow succeeded.

## Repository checks before submission

Run from the repository root:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Resolve any failing check before describing the repository as build-clean. Confirm the public repository opens without authentication and the production URL loads.

## Official submission checklist

The current official hackathon page states that the build period ends **14 November 2026 at 23:59 UTC**. Verify the deadline and submission form on the official site before submitting.

- [ ] Confirm this repository is public.
- [ ] Confirm the README accurately describes the current implementation and limitations.
- [ ] Record a working demo video or capture clear screenshots.
- [ ] Publish a public X post stating that the project was built for NEAR HACKATHON.
- [ ] Tag **@NEARProtocol** and include **#NEARHackathon**.
- [ ] Attach the demo video or screenshots to the X post.
- [ ] Submit both the public repository URL and public X demo-post URL through the official form.
- [ ] Enter the correct NEAR account address for any prize payout.
- [ ] Review all submission details before final submission; the organizer says each project gets one submission.

## Demo narration — safe wording

“Alesxras is a privacy-first procurement workspace. Buyers publish sourcing requests, suppliers submit sealed proposals, and bounded AI agents help evaluate procurement evidence and prepare negotiation plans. Human approval remains separate from agent analysis. The current prototype verifies recorded NEAR transaction evidence, while live payment signing and autonomous settlement remain future implementation work.”
