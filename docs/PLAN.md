# WizzyHax — Plan

## Kararlar

| Konu | Karar |
|---|---|
| Kapsam | Oyun sonra; önce çalışan mağaza + ödeme |
| Hosting | Cloudflare Pages (ücretsiz, build yok) + Functions + D1 |
| Ödeme | Gumroad (0 ön ödeme, %10 + $0,50, TRY banka payout) |
| Yedek ödeme | Kripto (Faz 4) |
| Dil | TR + EN (JSON sözlük, `?lang=en`) |
| Ürün verisi | `products.json` → Faz 3'te admin panel |
| Ürün | Robrun Lifetime Cheat, $5, tek seferlik |

## Fazlar

1. **Faz 1 — Site** ✅ vitrin, ürün sayfası, yasal sayfalar, TR/EN, mobil sticky CTA
2. **Faz 2 — Ödeme döngüsü** ✅ webhook, HMAC anahtar, D1, e-posta, anahtar sorgulama, simülasyon
3. **Faz 3 — Admin** ürün/sipariş yönetimi, kuponlar, iade butonu
4. **Faz 4 — Kripto + analitik** NOWPayments/Cryptomus, huni ölçümü

## Dönüşüm kuralları

- Kayıt yok, tek zorunlu alan e-posta (Gumroad toplar).
- İlk ekranda fiyat + satın al; mobilde sabit alt bar.
- Sahte aciliyet / sahte indirim yok (Reklam Kurulu + ödeme sağlayıcı riski).
- Kart bilgisi hiçbir zaman bizim sunucumuza girmez.

## Teknik notlar

- Anahtar: `HMAC-SHA256(KEY_SECRET, orderId)` → `WIZY-XXXX-XXXX-XXXX` (I/L/O/0/1 yok).
- Idempotent: aynı `provider_sale_id` ikinci kez anahtar üretmez.
- İade: Gumroad ping'inde `refunded/disputed/chargebacked` → anahtar `revoked`.
- Webhook imzasız olduğu için satış **Gumroad API'den doğrulanır**; token yoksa istek reddedilir.
- `/tesekkur.html` anahtarı yalnızca e-posta + sipariş no eşleşirse gösterir.

## Açık riskler

- Gumroad ürün incelemesinde "cheat" ifadesi sorun çıkarabilir → yedek başlık: "Robrun Lifetime Pack".
- Oyun Play Store'a giderse harici kilit açma Play Billing politikasına takılır; site tanıtım + IAP modeline geçilmeli.
- `DEV_SECRET` canlıda unutulmamalı; iş bitince silinmeli.
