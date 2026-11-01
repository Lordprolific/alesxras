# Alesxras

A privacy-first procurement platform where organizations can source suppliers,
compare private bids, use bounded agents for evaluation and negotiation, and
authorize controlled NEAR transactions.

## Architecture

- `apps/web`: Next.js App Router interface and authenticated API boundary.
- `packages/domain`: procurement lifecycle, approval, and spending rules.
- `packages/agents`: agent permissions, budgets, evaluation, and negotiation.
- `packages/near`: isolated chain gateway and transaction verification boundary.
- `packages/worker`: background orchestration process.
- `packages/database`: PostgreSQL migrations and tenant isolation policies.
- `contracts/`: NEAR contracts will be added and tested before testnet deployment.

## Development

Use the Node.js version supported by the pinned Next.js release. Install the
workspace once with `npm install`, then run `npm run dev`, `npm test`,
`npm run typecheck`, `npm run lint`, or `npm run build` from the repository root.

The current dashboard is labeled sample data. Wallet, database, model-provider,
queue, and contract connections are not configured in this repository yet.
No real funds can be moved by this scaffold. Private bid amounts and proposals
are designed for application-level encryption before reveal; signing credentials
must remain isolated from web requests and agent tools.

Database migrations must be backed up and the backup verified before applying
them to a hosted database. Contracts must pass local tests and a testnet review
before deployment. Mainnet signing and real financial transactions are disabled
until separately authorized.
