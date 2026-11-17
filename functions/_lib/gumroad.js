// Gumroad doğrulama + ürün eşleme

/**
 * Webhook'un gerçekten Gumroad'dan geldiğini doğrular.
 * İmza yok; bu yüzden satışı Gumroad API'sinden çekip kontrol ediyoruz.
 */
export async function fetchSale(env, saleId) {
  if (!env.GUMROAD_ACCESS_TOKEN) return { ok: false, reason: "no_token" };
  const url =
    "https://api.gumroad.com/v2/sales/" +
    encodeURIComponent(saleId) +
    "?access_token=" +
    encodeURIComponent(env.GUMROAD_ACCESS_TOKEN);

  let res;
  try {
    res = await fetch(url, { headers: { accept: "application/json" } });
  } catch {
    return { ok: false, reason: "network" };
  }
  if (!res.ok) return { ok: false, reason: "api_" + res.status };

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, reason: "bad_json" };
  }
  if (!data || !data.success || !data.sale) return { ok: false, reason: "no_sale" };

  const s = data.sale;
  if (s.refunded || s.chargedback || s.disputed) return { ok: false, reason: "refunded" };

  return {
    ok: true,
    sale: {
      id: String(s.id || saleId),
      orderNumber: s.order_number || "",
      email: String(s.email || "").toLowerCase(),
      productId: s.product_id || "",
      permalink: s.product_permalink || s.permalink || "",
      priceCents: Math.round(Number(s.price || 0)),
      currency: s.currency || "usd",
      refunded: false,
    },
  };
}

/** products.json içinden satışa karşılık gelen ürünü bulur. */
export async function matchProduct(request, env, sale) {
  try {
    const url = new URL("/products.json", request.url);
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const hit = list.find(
          (p) =>
            (sale.productId && p.gumroadProductId && p.gumroadProductId === sale.productId) ||
            (sale.permalink && p.gumroadPermalink && p.gumroadPermalink === sale.permalink) ||
            (sale.permalink && p.slug && p.slug === sale.permalink)
        );
        if (hit) return hit;
      }
    }
  } catch {
    /* yoksay */
  }
  const fallback = env.DEFAULT_PRODUCT_SLUG || "robrun-lifetime";
  return { slug: fallback, title: env.DEFAULT_PRODUCT_TITLE || "Robrun Lifetime Cheat" };
}
