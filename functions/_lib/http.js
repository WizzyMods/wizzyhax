// Küçük HTTP yardımcıları (Pages Functions)

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function readBody(request) {
  const type = (request.headers.get("content-type") || "").toLowerCase();
  if (type.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    try {
      const fd = await request.formData();
      const out = {};
      for (const [k, v] of fd.entries()) out[k] = typeof v === "string" ? v : "";
      return out;
    } catch {
      return {};
    }
  }
  return {};
}

export function truthy(v) {
  return v === true || v === "true" || v === "1" || v === 1;
}

export function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

export function normOrder(v) {
  return String(v || "").trim().toUpperCase();
}

export function requirePost(request) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }
  return null;
}
