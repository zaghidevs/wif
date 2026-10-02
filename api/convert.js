// Turns any uploaded image into a wif-hat image with an image-editing model on fal.ai.
// Env: FAL_KEY (required), FAL_MODEL (optional), CONVERT_LIMIT_PER_HOUR (optional, default 12)
import fs from "node:fs";
import path from "node:path";
import { json, readJson, parseDataUrl, rateLimited } from "./_lib.js";

let REF;
function reference() {
  if (!REF) REF = "data:image/jpeg;base64," + fs.readFileSync(path.join(process.cwd(), "reference.jpg")).toString("base64");
  return REF;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });
  const key = process.env.FAL_KEY;
  if (!key) return json(res, 503, { error: "AI converter isn't set up yet (FAL_KEY missing)." });
  const limit = Number(process.env.CONVERT_LIMIT_PER_HOUR || 12);
  if (rateLimited(req, "convert", limit, 3600_000)) return json(res, 429, { error: "Too many conversions. Try again in a bit." });

  let body;
  try { body = await readJson(req); } catch { return json(res, 400, { error: "Bad request" }); }
  const img = parseDataUrl(body.image);
  if (!img) return json(res, 400, { error: "Send a PNG, JPG, WebP or GIF image." });
  if (img.buf.length > 3_000_000) return json(res, 413, { error: "Image too large (3 MB max)." });
  const prompt = String(body.prompt || "").slice(0, 2000);
  if (prompt.length < 20) return json(res, 400, { error: "Missing prompt." });

  const model = process.env.FAL_MODEL || "fal-ai/nano-banana/edit";
  try {
    const r = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt, image_urls: [reference(), body.image], num_images: 1, output_format: "jpeg" }),
    });
    const j = await r.json().catch(() => ({}));
    const url = j?.images?.[0]?.url || j?.image?.url;
    if (!r.ok || !url) {
      const msg = typeof j?.detail === "string" ? j.detail : j?.detail?.[0]?.msg || `Model error (${r.status})`;
      return json(res, 502, { error: msg });
    }
    // Pull the result back through the server so the browser never hits CORS issues.
    const ir = await fetch(url);
    if (!ir.ok) return json(res, 502, { error: "Couldn't download the converted image." });
    const type = ir.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(await ir.arrayBuffer()).toString("base64");
    json(res, 200, { image: `data:${type};base64,${b64}` });
  } catch (e) {
    json(res, 502, { error: "AI converter unreachable. Try again." });
  }
}
