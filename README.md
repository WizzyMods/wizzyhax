# WizzyHax

Dijital ürün mağazası. Statik site + Cloudflare Pages Functions + D1.
Ödeme Gumroad üzerinden alınır; satış onaylandığında lisans anahtarı otomatik üretilir ve e-postayla gönderilir.

```
public/             → statik site (build yok)
  products.json     → ürün kataloğu (site + webhook bunu okur)
functions/api/      → /api/* uç noktaları (Pages Functions)
schema.sql          → D1 tabloları
```

## 1. Yerel önizleme (opsiyonel)

```bash
cd public && python3 -m http.server 8080
# http://localhost:8080
```

Statik sayfalar çalışır; `/api/*` çağrıları yerelde 404 döner (API için Cloudflare gerekir).

## 2. Cloudflare Pages kurulumu

1. Cloudflare panel → **Workers & Pages → Create → Pages → Connect to Git**
2. `WizzyMods/wizzyhax` reposunu seç
3. Ayarlar:
   - **Framework preset:** None
   - **Build command:** *(boş bırak)*
   - **Build output directory:** `public`
4. **Save and Deploy** → site `https://wizzyhax.pages.dev` adresinde yayına girer

## 3. D1 veritabanı

Panel → **Storage & Databases → D1 → Create** → isim: `wizzyhax-db`
Ardından **Console** sekmesinde `schema.sql` içeriğini tek tek çalıştır (veya CLI):

```bash
npx wrangler d1 execute wizzyhax-db --remote --file=./schema.sql
```

Sonra **Pages projesi → Settings → Functions → D1 database bindings**:

| Variable name | D1 database |
|---|---|
| `DB` | `wizzyhax-db` |

## 4. Ortam değişkenleri

**Pages projesi → Settings → Environment variables** (Production):

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `KEY_SECRET` | ✅ | Anahtar imzalama sırrı. Uzun rastgele bir dize üret, kimseyle paylaşma. |
| `GUMROAD_ACCESS_TOKEN` | ✅ | Gumroad → Settings → Advanced → *Access token*. Webhook doğrulaması için. |
| `BREVO_API_KEY` | — | E-posta gönderimi. Yoksa anahtar sadece ekranda gösterilir. |
| `MAIL_FROM` | — | Gönderen adresi (Brevo'da doğrulanmış olmalı), ör. `destek@wizzyhax.com` |
| `MAIL_FROM_NAME` | — | `WizzyHax` |
| `SITE_URL` | — | `https://wizzyhax.pages.dev` |
| `DEV_SECRET` | — | Test uç noktasını açar. **Canlıda kullanacaksan uzun ve tahmin edilemez olsun, iş bitince sil.** |
| `DEFAULT_PRODUCT_SLUG` | — | `robrun-lifetime` |
| `DEFAULT_PRODUCT_TITLE` | — | `Robrun Lifetime Cheat` |

> `KEY_SECRET` değişirse daha önce üretilmiş anahtarlar yine D1'den doğrulanır; ancak aynı sipariş için yeniden üretim farklı anahtar verir. Sabit tut.

## 5. Gumroad bağlantısı

1. Ürünü oluştur (dijital ürün, fiyat $5).
2. Ürün linkini `public/products.json` içindeki `gumroadUrl` alanına yaz ve `active: true` yap.
3. `gumroadPermalink` alanına ürünün URL son parçasını yaz (ör. `robrun-lifetime`).
4. Gumroad → **Settings → Advanced → Ping (webhook)**:

```
https://wizzyhax.pages.dev/api/gumroad-webhook
```

5. **Test:** ürünü kendin satın al → Gumroad panelinde satış görünür → webhook düşer → anahtar üretilir → `/tesekkur.html` sayfasında e-posta + sipariş numarası ile görünür.

> Gumroad bakiyesi **$100**'ü geçmeden banka payout'u yapılmaz. İlk testte para bankaya gelmez; satış ve bakiye Gumroad panelinde görünür.

## 6. Uçtan uca test (Gumroad olmadan)

`DEV_SECRET` tanımlıysa:

```bash
curl -X POST https://wizzyhax.pages.dev/api/dev/simulate \
  -H "content-type: application/json" \
  -H "x-dev-secret: BURAYA_DEV_SECRET" \
  -d '{"email":"test@ornek.com","sendEmail":false}'
```

Yanıt: `{ "ok": true, "orderId": "WZ-XXXXXX", "key": "WIZY-XXXX-XXXX-XXXX" }`

Sonra `/tesekkur.html` sayfasında aynı e-posta + sipariş numarası ile anahtarı görüntüle.
Sağlık kontrolü: `GET /api/health`

## 7. API

| Uç nokta | Metot | Görev |
|---|---|---|
| `/api/gumroad-webhook` | POST | Gumroad satış/iade bildirimi |
| `/api/siparis-sorgula` | POST | `{email, orderId}` → anahtarlar |
| `/api/dogrula` | POST | `{key}` → `{valid, product}` |
| `/api/dev/simulate` | POST | Test satışı (DEV_SECRET) |
| `/api/health` | GET | Bağlantı durumu |

## 8. Ürün eklemek

`public/products.json`'a yeni nesne ekle, push et. Alanlar: `slug`, `title`, `subtitle`, `price`, `badge`, `features`, `gumroadUrl`, `gumroadPermalink`, `gumroadProductId`, `active`.

## 9. Bilinen sınırlar (v1)

- Anahtar sorgulama oran sınırı yok (Cloudflare WAF/rate limit kuralı ile eklenebilir).
- Admin paneli yok; siparişler D1 panelinden görüntülenir.
- Yasal sayfalar yalnızca Türkçe.
