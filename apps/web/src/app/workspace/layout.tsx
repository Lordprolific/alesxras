import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSessionProof, SESSION_COOKIE, verifySessionProof } from "@/lib/auth";
import { ensureWorkspaceForWallet } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const proof = decodeSessionProof(cookieStore.get(SESSION_COOKIE)?.value);
  if (!proof || !(await verifySessionProof(proof))) redirect("/launch?returnTo=%2Fworkspace");

  // Resolve the workspace from the verified wallet identity, never from client input.
  await ensureWorkspaceForWallet(proof.accountId);
  return children;
}
