import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSessionProof, SESSION_COOKIE, verifySessionProof } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const proof = decodeSessionProof(cookieStore.get(SESSION_COOKIE)?.value);
  if (!proof || !(await verifySessionProof(proof))) redirect("/launch?returnTo=%2Fworkspace");
  return children;
}
