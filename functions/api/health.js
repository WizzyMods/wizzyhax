// Basit sağlık kontrolü — sırlar sızdırılmaz, sadece bağlı mı bilgisi.

import { json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  let dbOk = false;
  if (env.DB) {
    try {
      const row = await env.DB.prepare("SELECT 1 AS ok").first();
      dbOk = !!(row && row.ok === 1);
    } catch {
      dbOk = false;
    }
  }
  return json({
    ok: true,
    version: "1",
    db: dbOk,
    gumroad: !!env.GUMROAD_ACCESS_TOKEN,
    mail: !!env.BREVO_API_KEY,
    devEndpoints: !!env.DEV_SECRET,
  });
}
