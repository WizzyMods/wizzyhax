-- WizzyHax D1 şeması
-- wrangler d1 execute wizzyhax-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS orders (
  id                    TEXT PRIMARY KEY,           -- WZ-XXXXXX
  provider              TEXT NOT NULL,              -- gumroad | simulate
  provider_sale_id      TEXT UNIQUE,                -- Gumroad sale id
  provider_order_number TEXT,                       -- Gumroad order_number (makbuzdaki numara)
  email                 TEXT NOT NULL,
  product_slug          TEXT NOT NULL,
  amount_cents          INTEGER,
  currency              TEXT NOT NULL DEFAULT 'usd',
  status                TEXT NOT NULL DEFAULT 'paid', -- paid | refunded
  created_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS keys (
  key         TEXT PRIMARY KEY,                     -- WIZY-XXXX-XXXX-XXXX
  order_id    TEXT NOT NULL REFERENCES orders (id),
  status      TEXT NOT NULL DEFAULT 'active',       -- active | revoked
  created_at  TEXT NOT NULL,
  revoked_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_keys_order ON keys (order_id);

CREATE TABLE IF NOT EXISTS coupons (
  code        TEXT PRIMARY KEY,
  percent_off INTEGER NOT NULL,
  max_uses    INTEGER,
  uses        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS waitlist (
  email      TEXT PRIMARY KEY,
  lang       TEXT,
  created_at TEXT NOT NULL
);
