import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSessionProof, SESSION_COOKIE } from "@/lib/auth";
import { ensureWorkspaceForWallet } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  // Validate the server-signed session locally. NEAR ownership was checked at login.
  const proof = decodeSessionProof(cookieStore.get(SESSION_COOKIE)?.value);
  if (!proof) redirect("/launch?returnTo=%2Fworkspace");

  // Resolve the workspace from the verified wallet identity, never from client input.
  await ensureWorkspaceForWallet(proof.accountId);
  return children;
}
