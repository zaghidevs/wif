// Builds the unsigned pump.fun create (+ dev buy) transaction via PumpPortal's local-trade API.
// The browser signs it with the new mint keypair and the user's own wallet. No keys ever touch this server.
import { json, readJson, isB58 } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  let b;
  try { b = await readJson(req); } catch { return json(res, 400, { error: "Bad request" }); }
  const { publicKey, mint, name, symbol, uri } = b;
  const amount = Number(b.amount);
  if (!isB58(publicKey) || !isB58(mint)) return json(res, 400, { error: "Bad wallet or mint address." });
  if (!name || !symbol || !/^https?:\/\//.test(uri || "")) return json(res, 400, { error: "Missing coin metadata." });
  if (!(amount >= 0) || amount > 100) return json(res, 400, { error: "Dev buy must be between 0 and 100 SOL." });
  try {
    const r = await fetch("https://pumpportal.fun/api/trade-local", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey, action: "create", mint,
        tokenMetadata: { name: String(name).slice(0, 32), symbol: String(symbol).slice(0, 10), uri },
        denominatedInSol: "true", amount, slippage: 10,
        priorityFee: Number(process.env.PRIORITY_FEE_SOL || 0.0005), pool: "pump",
      }),
    });
    if (!r.ok) return json(res, 502, { error: `PumpPortal: ${(await r.text()).slice(0, 200)}` });
    const buf = Buffer.from(await r.arrayBuffer());
    json(res, 200, { tx: buf.toString("base64") });
  } catch {
    json(res, 502, { error: "PumpPortal unreachable. Try again." });
  }
}
