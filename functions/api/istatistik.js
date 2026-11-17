// Gerçek satış sayısı — yalnızca eşik aşıldığında gösterilir.

import { json } from "../_lib/http.js";

const DEFAULT_THRESHOLD = 25;

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: "db_missing" }, 500);

  const threshold = Number(env.MIN_SALES_TO_SHOW || DEFAULT_THRESHOLD);

  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM orders WHERE provider = 'gumroad' AND status = 'paid'"
  ).first();

  const count = Number(row && row.n) || 0;

  return json({
    ok: true,
    // Sayı, yalnızca gerçekten eşiği geçtiyse açıklanır.
    show: count >= threshold,
    count: count >= threshold ? count : 0,
    threshold,
  });
}
