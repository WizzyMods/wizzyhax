// Anahtar doğrulama (oyun/uygulama tarafından çağrılabilir).

import { json, readBody } from "../_lib/http.js";
import { isKeyShape } from "../_lib/keys.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "db_missing" }, 500);

  const body = await readBody(request);
  const key = String(body.key || "").trim().toUpperCase();
  if (!isKeyShape(key)) return json({ valid: false, reason: "bad_format" }, 200);

  const row = await env.DB.prepare(
    `SELECT k.key, k.status, k.created_at, o.product_slug, o.status AS order_status
     FROM keys k JOIN orders o ON o.id = k.order_id
     WHERE k.key = ?`
  )
    .bind(key)
    .first();

  if (!row) return json({ valid: false, reason: "unknown" }, 200);
  if (row.status !== "active" || row.order_status !== "paid") {
    return json({ valid: false, reason: "revoked" }, 200);
  }

  return json({
    valid: true,
    product: row.product_slug,
    issuedAt: row.created_at,
  });
}
