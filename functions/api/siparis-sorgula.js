// Sipariş numarası + e-posta ile anahtar görüntüleme.

import { json, readBody, normEmail, normOrder } from "../_lib/http.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "db_missing" }, 500);

  const body = await readBody(request);
  const email = normEmail(body.email);
  const order = normOrder(body.orderId || body.order || body.orderNumber);

  if (!email || !order) return json({ ok: false, error: "missing_fields" }, 400);

  const rows = await env.DB.prepare(
    `SELECT o.id AS order_id, o.product_slug, o.created_at AS order_created,
            k.key, k.status
     FROM orders o
     LEFT JOIN keys k ON k.order_id = o.id
     WHERE o.email = ?
       AND (upper(o.id) = ? OR upper(o.provider_order_number) = ?)
     ORDER BY k.created_at ASC`
  )
    .bind(email, order, order)
    .all();

  const list = rows.results || [];
  if (!list.length) return json({ ok: false, error: "not_found" }, 404);

  return json({
    ok: true,
    orderId: list[0].order_id,
    product: list[0].product_slug,
    keys: list.map((r) => ({ key: r.key, status: r.status || "active" })),
  });
}
