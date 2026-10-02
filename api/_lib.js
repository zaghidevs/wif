// Shared helpers (files starting with "_" are not deployed as endpoints)
export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export function parseDataUrl(s) {
  const m = /^data:(image\/(png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(s || "");
  if (!m) return null;
  return { mime: m[1], ext: m[2] === "jpeg" ? "jpg" : m[2], buf: Buffer.from(m[3], "base64") };
}

// Simple per-instance rate limit. Good enough to stop casual abuse of the paid AI endpoint.
const hits = new Map();
export function rateLimited(req, key, max, windowMs) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "anon";
  const id = key + ":" + ip, now = Date.now();
  const list = (hits.get(id) || []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(id, list);
  return list.length > max;
}

export const isB58 = (s) => typeof s === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
export const cleanUrl = (s) => {
  s = String(s || "").trim();
  return /^https:\/\/[^\s"'<>]{3,200}$/.test(s) ? s : "";
};
