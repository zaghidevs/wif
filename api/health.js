import { json } from "./_lib.js";
export default function handler(req, res) {
  json(res, 200, { ai: Boolean(process.env.FAL_KEY), rpc: Boolean(process.env.SOLANA_RPC_URL), launch: true });
}
