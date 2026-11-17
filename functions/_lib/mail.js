// E-posta gönderimi — Brevo (ücretsiz kota: 300/gün)
// BREVO_API_KEY tanımlı değilse sessizce atlanır.

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendKeyEmail(env, { to, orderId, keys, productTitle, siteUrl }) {
  if (!env.BREVO_API_KEY) return { skipped: true, reason: "no_api_key" };

  const site = siteUrl || env.SITE_URL || "https://wizzyhax.pages.dev";
  const keyRows = keys
    .map(
      (k) =>
        `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;letter-spacing:2px;background:#0b0e16;color:#b6ff3c;padding:14px 16px;border-radius:10px;margin:8px 0">${esc(
          k
        )}</div>`
    )
    .join("");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#070910;color:#e9edf7;padding:28px;border-radius:16px">
    <h2 style="margin:0 0 6px;font-size:20px">Lisans anahtarın hazır</h2>
    <p style="color:#939db4;margin:0 0 18px">${esc(productTitle)} · Tek seferlik ödeme</p>
    ${keyRows}
    <p style="color:#939db4;font-size:14px;margin:16px 0 6px">Sipariş numaran: <b style="color:#e9edf7">${esc(
      orderId
    )}</b></p>
    <p style="color:#939db4;font-size:14px;margin:0 0 18px">Anahtarını burada tekrar görüntüleyebilirsin:
      <a href="${esc(site)}/tesekkur.html" style="color:#b6ff3c">${esc(site)}/tesekkur.html</a>
    </p>
    <p style="color:#5f6a80;font-size:12px;margin:0">Anahtar kişiye özeldir, paylaşmayın. Sorular için bu e-postayı yanıtlayın.</p>
  </div>`;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: env.MAIL_FROM_NAME || "WizzyHax",
          email: env.MAIL_FROM || "destek@wizzyhax.com",
        },
        replyTo: { email: env.MAIL_FROM || "destek@wizzyhax.com" },
        to: [{ email: to }],
        subject: "Lisans anahtarın — " + productTitle,
        htmlContent: html,
      }),
    });
    if (!res.ok) return { skipped: false, ok: false, status: res.status };
    return { skipped: false, ok: true };
  } catch {
    return { skipped: false, ok: false, status: 0 };
  }
}
