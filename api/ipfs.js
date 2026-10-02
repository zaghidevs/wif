// Uploads the coin image + metadata. Tries pump.fun's IPFS endpoint first, then Pinata if PINATA_JWT is set.
import { json, readJson, parseDataUrl, cleanUrl } from "./_lib.js";

async function viaPump(img, meta) {
  const fd = new FormData();
  fd.append("file", new Blob([img.buf], { type: img.mime }), `wif.${img.ext}`);
  for (const [k, v] of Object.entries(meta)) fd.append(k, v);
  fd.append("showName", "true");
  const r = await fetch("https://pump.fun/api/ipfs", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.metadataUri) throw new Error(`pump.fun ipfs ${r.status}`);
  return j.metadataUri;
}

async function pinFile(blob, name, jwt) {
  const fd = new FormData();
  fd.append("network", "public");
  fd.append("file", blob, name);
  const r = await fetch("https://uploads.pinata.cloud/v3/files", { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.data?.cid) throw new Error(`pinata ${r.status}`);
  return j.data.cid;
}

async function viaPinata(img, meta, jwt) {
  const gw = (process.env.PINATA_GATEWAY || "https://ipfs.io").replace(/\/$/, "");
  const imgCid = await pinFile(new Blob([img.buf], { type: img.mime }), `wif.${img.ext}`, jwt);
  const metadata = { ...meta, image: `${gw}/ipfs/${imgCid}`, showName: true, createdOn: "https://pump.fun" };
  for (const k of ["twitter", "telegram", "website"]) if (!metadata[k]) delete metadata[k];
  const metaCid = await pinFile(new Blob([JSON.stringify(metadata)], { type: "application/json" }), "metadata.json", jwt);
  return `${gw}/ipfs/${metaCid}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  let b;
  try { b = await readJson(req); } catch { return json(res, 400, { error: "Bad request" }); }
  const img = parseDataUrl(b.image);
  if (!img) return json(res, 400, { error: "Missing image." });
  if (img.buf.length > 3_000_000) return json(res, 413, { error: "Image too large (3 MB max)." });
  const name = String(b.name || "").trim().slice(0, 32);
  const symbol = String(b.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  if (!name || !symbol) return json(res, 400, { error: "Name and ticker are required." });
  const meta = {
    name, symbol,
    description: String(b.description || "").slice(0, 500),
    twitter: cleanUrl(b.twitter), telegram: cleanUrl(b.telegram), website: cleanUrl(b.website),
  };
  try {
    return json(res, 200, { metadataUri: await viaPump(img, meta), name, symbol });
  } catch (e) {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) return json(res, 502, { error: "pump.fun's image upload is down right now. Add PINATA_JWT as a backup or try again." });
    try { return json(res, 200, { metadataUri: await viaPinata(img, meta, jwt), name, symbol }); }
    catch { return json(res, 502, { error: "Image upload failed on both pump.fun and Pinata. Try again." }); }
  }
}
