// Gumroad "sale" ping alıcısı.
// Güvenlik: ping imzalı değil → satış API'den doğrulanmadan anahtar üretilmez.

import { json, readBody, truthy, normEmail } from "../_lib/http.js";
import { fetchSale, matchProduct } from "../_lib/gumroad.js";
import { createOrder, findOrderBySaleId, revokeBySaleId } from "../_lib/orders.js";
import { sendKeyEmail } from "../_lib/mail.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "db_missing" }, 500);

  const body = await readBody(request);
  const saleId = String(body.sale_id || body.saleId || "").trim();
  if (!saleId) return json({ ok: false, error: "no_sale_id" }, 400);

  // İade / itiraz / chargeback bildirimi → anahtarı iptal et
  if (truthy(body.refunded) || truthy(body.disputed) || truthy(body.chargebacked)) {
    const revoked = await revokeBySaleId(env, saleId);
    return json({ ok: true, revoked });
  }

  const existing = await findOrderBySaleId(env, saleId);
  if (existing) return json({ ok: true, duplicate: true, orderId: existing.orderId });

  const verified = await fetchSale(env, saleId);
  if (!verified.ok) {
    return json({ ok: false, error: "verify_failed", reason: verified.reason }, 400);
  }

  const sale = verified.sale;
  const email = normEmail(sale.email || body.email);
  if (!email) return json({ ok: false, error: "no_email" }, 400);

  const product = await matchProduct(request, env, sale);

  const created = await createOrder(env, {
    provider: "gumroad",
    providerSaleId: sale.id,
    providerOrderNumber: sale.orderNumber,
    email,
    slug: product.slug,
    amountCents: sale.priceCents,
    currency: sale.currency,
  });

  const mail = await sendKeyEmail(env, {
    to: email,
    orderId: created.orderId,
    keys: [created.key],
    productTitle: product.title,
    siteUrl: new URL(request.url).origin,
  });

  return json({ ok: true, orderId: created.orderId, mailed: !mail.skipped && !!mail.ok });
}

export async function onRequestGet() {
  return json({ ok: false, error: "use_post" }, 405);
}
