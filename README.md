# Alesxras

**Privacy-first procurement workspace with bounded AI assistance and human-controlled payment authorization.**

Alesxras helps organizations publish procurement requests, receive sealed supplier proposals, evaluate procurement briefs, and prepare negotiation plans. Its current AI workflows assist with analysis; they do not autonomously contact suppliers, award contracts, approve spending, or sign payments.

Production: https://thealesxras.vercel.app/

## What works today

- **Wallet-based workspace access:** the application includes NEAR Wallet Selector packages for wallet connection and account identity.
- **Procurement requests:** authenticated workspaces can create and manage procurement requests.
- **Supplier marketplace:** public, open requests can be discovered by other workspaces.
- **Sealed proposals:** supplier bid amounts and proposals are encrypted server-side before storage. The current negotiation agent receives proposal metadata only; it does not decrypt sealed bid contents.
- **Procurement evaluation agent:** sends the procurement brief to Google Gemini and saves structured output covering summary, evaluation criteria, missing information, risk flags, and next steps. The production worker uses a primary Gemini model, a fallback model, and bounded retry handling for transient provider failures.
- **Negotiation preparation agent:** creates a structured preparation brief from the procurement request and non-sensitive proposal metadata. It does not message suppliers or conduct an actual negotiation.
- **NEAR transaction verification workflow:** queries NEAR RPC for a recorded transaction hash and compares execution, recipient, and transfer amount against stored records. This is verification, not transaction submission or payment signing. No successful payment flow is claimed.
- **Human approval boundary:** agent workflows do not approve or sign payments.

## Current NEAR integration status

The application includes NEAR Wallet Selector dependencies for wallet connection/account identity. The repository also contains a NEAR gateway interface, transfer types, a testnet-only network guard, and a unit test confirming that the guard rejects mainnet.

The transaction verification route is separate from transaction execution. It requires a valid approval record and a real recorded transaction to produce meaningful verification. Treat the payment path as incomplete until approval safeguards and a real testnet end-to-end flow have been implemented and tested.

## Architecture

- `apps/web`: Next.js App Router UI and authenticated API routes.
- `packages/domain`: procurement state transitions, spending-policy checks, and approval matching rules.
- `packages/agents`: agent permission and budget types/guards.
- `packages/near`: NEAR gateway interfaces, transfer types, and testnet guard. This is an abstraction boundary, not a live signer.
- `packages/worker`: background worker orchestration.
- `database/`: database schema and supporting database assets.
- `contracts/`: reserved for smart contracts; no deployed procurement contract is claimed.

## Local development

Requirements: Node.js compatible with the pinned Next.js version and npm.

```bash
npm install
npm run dev
```

Useful checks from the repository root:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The root scripts run workspace checks. Use the same Node/npm versions in CI and local development when reproducing a deployment.

## Environment configuration

Configure secrets in the deployment environment. Never commit them to Git or paste them into issue reports.

The application/worker currently relies on server-side configuration including:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `CRON_SECRET`
- `GEMINI_API_KEY`
- Optional `AGENT_MODEL` and `AGENT_FALLBACK_MODEL` to override Gemini model defaults.
- `VERCEL_AUTOMATION_BYPASS_SECRET` when required to reach a protected Vercel deployment.

Wallet, session, and sealed-bid encryption configuration must also be set according to the corresponding server-side modules and deployment environment. Do not expose server secrets to browser bundles.

## Security and operational boundaries

- Treat procurement descriptions and supplier-submitted text as untrusted input.
- Keep sealed proposal plaintext out of agent prompts unless an explicitly authorized reveal workflow is implemented.
- AI output is advisory and must be reviewed by a human.
- Agents must not have wallet signing keys or payment-approval authority.
- Verify approval status and expiry, recipient, amount, network, and final transaction execution before treating a payment as settled.
- Mainnet payment execution is not enabled in this release.
- Gemini availability and quota are external dependencies. The worker retries transient failures and can use a configured fallback model, but provider availability is not guaranteed.

## Demo scope

A reproducible demo should show the production workspace, a procurement request, a sealed supplier proposal, a saved evaluation result, and a negotiation preparation result. If transaction verification is shown, use a real recorded transaction or clearly show the honest `insufficient_evidence` state. Do not present a mock or unsubmitted payment as a completed NEAR transaction.

See [HACKATHON.md](./HACKATHON.md) for the project-specific demo and submission checklist.
