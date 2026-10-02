// Relays the fully signed transaction to your Solana RPC and waits for confirmation.
// Env: SOLANA_RPC_URL (e.g. a free Helius mainnet URL). Keeps the RPC key off the client.
import { json, readJson } from "./_lib.js";

async function rpc(url, method, params) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  const url = process.env.SOLANA_RPC_URL;
  if (!url) return json(res, 503, { error: "SOLANA_RPC_URL not set." });
  let b;
  try { b = await readJson(req); } catch { return json(res, 400, { error: "Bad request" }); }
  if (typeof b.tx !== "string" || b.tx.length > 3000) return json(res, 400, { error: "Bad transaction." });
  try {
    const sig = await rpc(url, "sendTransaction", [b.tx, { encoding: "base64", skipPreflight: false, preflightCommitment: "processed", maxRetries: 5 }]);
    const until = Date.now() + 45_000;
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, 1500));
      const st = (await rpc(url, "getSignatureStatuses", [[sig]]))?.value?.[0];
      if (st?.err) return json(res, 400, { error: "Transaction failed on-chain.", signature: sig });
      if (st && (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")) return json(res, 200, { signature: sig, confirmed: true });
    }
    json(res, 200, { signature: sig, confirmed: false });
  } catch (e) {
    json(res, 400, { error: String(e.message || e).slice(0, 300) });
  }
}
