"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setupWalletSelector, type WalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { SESSION_DURATION_SECONDS } from "@/lib/auth";

let selectorPromise: Promise<WalletSelector> | undefined;
function getSelector() {
  selectorPromise ??= setupWalletSelector({ network: "testnet", modules: [setupMyNearWallet()] });
  return selectorPromise;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function sessionMessage(proof: { nonce: string; issuedAt: number; expiresAt: number; recipient: string }) {
  return [
    "Alesxras testnet workspace access",
    `Issued: ${proof.issuedAt}`,
    `Expires: ${proof.expiresAt}`,
    `Nonce: ${proof.nonce}`,
    `Application: ${proof.recipient}`,
  ].join("\n");
}

export function LaunchGate() {
  const router = useRouter();
  const returnTo = "/workspace";
  const [state, setState] = useState<"checking" | "ready" | "connecting" | "signing" | "verifying" | "error">("checking");
  const [accountId, setAccountId] = useState("");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  const authenticate = useCallback(async (selector: WalletSelector) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const wallet = await selector.wallet("my-near-wallet");
      if (typeof wallet.signMessage !== "function") throw new Error("This wallet does not support signing a private login message.");
      setState("signing");

      const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
      const issuedAt = Date.now();
      const expiresAt = issuedAt + SESSION_DURATION_SECONDS * 1000;
      const nonce = toBase64Url(nonceBytes);
      const recipient = window.location.host.toLowerCase();
      const messageFields = { nonce, issuedAt, expiresAt, recipient };
      const signed = await wallet.signMessage({ message: sessionMessage(messageFields), recipient, nonce: nonceBytes as unknown as Buffer });
      if (!signed?.signature || !signed.publicKey || !signed.accountId) {
        throw new Error("The wallet did not return a complete signature for this account.");
      }
      setAccountId(signed.accountId);

      setState("verifying");
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...messageFields, accountId: signed.accountId, signature: signed.signature, publicKey: signed.publicKey }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? "The signed wallet session could not be verified.");
      }
      router.replace(returnTo);
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Wallet verification failed. Please try again.";
      setMessage(text);
      setState("error");
      inFlight.current = false;
    }
  }, [router, returnTo]);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session", { cache: "no-store" }).then((response) => {
      if (response.ok) router.replace(returnTo);
      else if (active) setState("ready");
    }).catch(() => { if (active) setState("ready"); });
    return () => { active = false; };
  }, [router, returnTo]);

  async function connect() {
    setMessage("");
    setState("connecting");
    try {
      const selector = await getSelector();
      await authenticate(selector);
    } catch (error) {
      if (!inFlight.current) {
        setMessage(error instanceof Error ? error.message : "The testnet wallet connection could not start.");
        setState("error");
      }
    }
  }

  return <main className="launch-page"><div className="launch-ambient launch-ambient-one"/><div className="launch-ambient launch-ambient-two"/><header className="launch-header"><Link href="/" className="site-brand"><svg aria-hidden="true" viewBox="0 0 36 36" className="site-mark"><path d="M18 3 31 10.5v15L18 33 5 25.5v-15L18 3Z" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M18 10v16M10.5 14.25l15 8.5M25.5 14.25l-15 8.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="18" cy="18" r="2.7" fill="currentColor"/></svg><span>alesxras</span></Link><span className="launch-network"><i/>NEAR TESTNET</span></header><section className="launch-card"><div className="launch-emblem"><div className="launch-emblem-ring"/><svg aria-hidden="true" viewBox="0 0 36 36" className="site-mark"><path d="M18 3 31 10.5v15L18 33 5 25.5v-15L18 3Z" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M18 10v16M10.5 14.25l15 8.5M25.5 14.25l-15 8.5" fill="none" stroke="currentColor" strokeWidth="1.4"/><circle cx="18" cy="18" r="2.7" fill="currentColor"/></svg></div><p className="launch-kicker">Your procurement workspace</p><h1>Enter with your<br/><em>NEAR account.</em></h1><p className="launch-description">Connect MyNearWallet on testnet and sign a short-lived login message. No transaction is created and no funds move.</p>{accountId && <p className="launch-account">Wallet account <strong>{accountId}</strong></p>}<button className="button-primary launch-connect" onClick={() => void connect()} disabled={state === "checking" || state === "connecting" || state === "signing" || state === "verifying"}>{state === "checking" ? "Checking session…" : state === "connecting" ? "Opening wallet…" : state === "signing" ? "Waiting for signature…" : state === "verifying" ? "Verifying on testnet…" : "Connect MyNearWallet"}</button>{message && <p className="launch-error" role="alert">{message}</p>}<p className="launch-footnote"><span className="testnet-pip"/>Authentication verifies a full-access key on NEAR testnet.</p><Link className="launch-back" href="/">Return to Alesxras</Link></section><footer className="launch-footer">Private by design · Human by decision · Testnet only</footer></main>;
}
