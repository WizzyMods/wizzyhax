// Geliştirme/test ucu: Gumroad ürünü olmadan uçtan uca akışı dener.
// DEV_SECRET tanımlı değilse uç nokta hiç yokmuş gibi 404 döner.

import { json, readBody, normEmail } from "../../_lib/http.js";
import { createOrder } from "../../_lib/orders.js";
import { sendKeyEmail } from "../../_lib/mail.js";

export async function onRequestPost({ request, env }) {
  if (!env.DEV_SECRET) return new Response("Not found", { status: 404 });

  const provided = request.headers.get("x-dev-secret") || "";
  if (provided !== env.DEV_SECRET) return json({ ok: false, error: "forbidden" }, 403);
  if (!env.DB) return json({ ok: false, error: "db_missing" }, 500);

  const body = await readBody(request);
  const email = normEmail(body.email);
  if (!email) return json({ ok: false, error: "no_email" }, 400);

  const slug = String(body.slug || env.DEFAULT_PRODUCT_SLUG || "robrun-lifetime");
  const title = String(body.title || env.DEFAULT_PRODUCT_TITLE || "Robrun Lifetime Cheat");
  const amount = Number(body.amountCents);

  const created = await createOrder(env, {
    provider: "simulate",
    providerSaleId: "sim-" + crypto.randomUUID(),
    providerOrderNumber: "SIM-" + created6(),
    email,
    slug,
    amountCents: Number.isFinite(amount) ? amount : 500,
    currency: "usd",
  });

  let mailed = false;
  if (body.sendEmail !== false) {
    const mail = await sendKeyEmail(env, {
      to: email,
      orderId: created.orderId,
      keys: [created.key],
      productTitle: title,
      siteUrl: new URL(request.url).origin,
    });
    mailed = !mail.skipped && !!mail.ok;
  }

  return json({ ok: true, orderId: created.orderId, key: created.key, mailed });
}

function created6() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  let s = "";
  for (let i = 0; i < 6; i++) s += a[b[i] % a.length];
  return s;
}
