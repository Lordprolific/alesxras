"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceSession() {
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) { router.replace("/launch"); return; }
      const result = await response.json() as { accountId: string };
      setAccountId(result.accountId);
    }).catch(() => router.replace("/launch"));
  }, [router]);

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/launch");
    router.refresh();
  }

  if (!accountId) return null;
  return <div className="workspace-auth"><span className="auth-live"><i/>Testnet wallet</span><span className="auth-account">{accountId}</span><button onClick={() => void signOut()}>Sign out</button></div>;
}
