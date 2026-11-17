// Sipariş + anahtar kaydı (D1)

import { makeKey, makeOrderId } from "./keys.js";

/** Aynı sağlayıcı satışı iki kez işlenmesin. */
export async function findOrderBySaleId(env, providerSaleId) {
  const row = await env.DB.prepare("SELECT id FROM orders WHERE provider_sale_id = ?")
    .bind(providerSaleId)
    .first();
  if (!row) return null;
  const keys = await env.DB.prepare("SELECT key, status FROM keys WHERE order_id = ?")
    .bind(row.id)
    .all();
  return { orderId: row.id, keys: keys.results || [] };
}

export async function createOrder(env, input) {
  const db = env.DB;
  const orderId = makeOrderId();
  const key = await makeKey(env.KEY_SECRET, orderId);
  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO orders
         (id, provider, provider_sale_id, provider_order_number, email, product_slug, amount_cents, currency, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`
      )
      .bind(
        orderId,
        input.provider,
        input.providerSaleId || null,
        input.providerOrderNumber || null,
        input.email,
        input.slug,
        Number.isFinite(input.amountCents) ? input.amountCents : null,
        (input.currency || "usd").toLowerCase(),
        now
      ),
    db
      .prepare("INSERT INTO keys (key, order_id, status, created_at) VALUES (?, ?, 'active', ?)")
      .bind(key, orderId, now),
  ]);

  return { duplicate: false, orderId, key };
}

/** İade/chargeback: satışa bağlı anahtarları iptal eder. */
export async function revokeBySaleId(env, providerSaleId) {
  const row = await env.DB.prepare("SELECT id FROM orders WHERE provider_sale_id = ?")
    .bind(providerSaleId)
    .first();
  if (!row) return false;
  await env.DB.batch([
    env.DB.prepare("UPDATE keys SET status = 'revoked', revoked_at = ? WHERE order_id = ?")
      .bind(new Date().toISOString(), row.id),
    env.DB.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").bind(row.id),
  ]);
  return true;
}
