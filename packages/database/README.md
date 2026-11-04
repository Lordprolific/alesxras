# Database package

PostgreSQL migrations live in `migrations/`. Keep bid content private and
organization scoped. Do not apply migrations to a hosted database until it is
provisioned, an existing database is backed up, and that backup is verified.

## Alesxras access model

NEAR testnet wallet signatures remain the authentication method. The Next.js
server verifies the signed session proof and resolves the wallet account to a
database user and organization membership. The browser never receives the
Supabase secret key and must not send trusted user or organization identifiers.

All application database requests use the server-only `SUPABASE_SECRET_KEY`
and `SUPABASE_URL` environment variables. This key bypasses RLS, so every
server handler must verify the wallet session and derive the user and
organization context from the verified NEAR account before reading or writing
organization data. Never expose the key through a `NEXT_PUBLIC_` variable,
client component, response body, or log.

The `0002_server_only_access.sql` migration revokes Data API table, sequence,
and function access from `anon` and `authenticated`. RLS remains enabled on
the application tables as defense in depth. The `0003_wallet_workspace_rpc.sql`
migration adds atomic first-login provisioning; only `service_role` can execute
it. It is SECURITY INVOKER and is not a browser-facing RPC.

Additional organizations and role assignments must be created through
explicit server-side authorization flows.
