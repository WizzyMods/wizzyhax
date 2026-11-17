// Lisans anahtarı üretimi — HMAC tabanlı, sunucusuz doğrulanabilir.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // I, L, O, 0, 1 yok (okunabilirlik)

function randomChars(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Sipariş numarası: WZ-XXXXXX */
export function makeOrderId() {
  return "WZ-" + randomChars(6);
}

/**
 * Sipariş numarasından deterministik anahtar üretir.
 * Aynı secret + aynı sipariş = aynı anahtar (idempotent tekrar denemelerde işe yarar).
 */
export async function makeKey(secret, orderId) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret || "dev-secret-change-me"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(orderId)));
  let body = "";
  for (let i = 0; i < 12; i++) body += ALPHABET[sig[i] % ALPHABET.length];
  return "WIZY-" + body.slice(0, 4) + "-" + body.slice(4, 8) + "-" + body.slice(8, 12);
}

export function isKeyShape(v) {
  return /^WIZY-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(String(v || "").trim().toUpperCase());
}
