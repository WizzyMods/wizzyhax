/* WizzyHax — ortak istemci kodu */
(function () {
  "use strict";

  var LANGS = ["tr", "en"];
  var DEFAULT_LANG = "tr";
  var state = { lang: DEFAULT_LANG, dict: {}, products: [] };

  /* ---------- yardımcılar ---------- */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function param(name) { return new URLSearchParams(location.search).get(name); }
  function money(amount, currency) {
    try {
      return new Intl.NumberFormat(state.lang === "tr" ? "tr-TR" : "en-US", {
        style: "currency", currency: currency || "USD", maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return "$" + amount;
    }
  }
  function t(key, fallback) {
    var v = state.dict[key];
    return v === undefined || v === null ? (fallback || key) : v;
  }
  function checkoutUrl(p) {
    if (!p || !p.gumroadUrl) return "";
    return p.gumroadUrl + (p.gumroadUrl.indexOf("?") > -1 ? "&" : "?") + "wanted=true";
  }
  function track(event, data) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: event }, data || {}));
    } catch (e) { /* sessiz */ }
  }

  /* ---------- dil ---------- */
  function pickLang() {
    var q = (param("lang") || "").toLowerCase();
    if (LANGS.indexOf(q) > -1) return q;
    try {
      var saved = localStorage.getItem("wh_lang");
      if (saved && LANGS.indexOf(saved) > -1) return saved;
    } catch (e) { /* gizli mod */ }
    var nav = (navigator.language || "").slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) > -1 ? nav : DEFAULT_LANG;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    qsa("[data-i18n]").forEach(function (el) {
      var v = state.dict[el.getAttribute("data-i18n")];
      if (v !== undefined) el.textContent = v;
    });
    qsa("[data-i18n-html]").forEach(function (el) {
      var v = state.dict[el.getAttribute("data-i18n-html")];
      if (v !== undefined) el.innerHTML = v;
    });
    qsa("[data-i18n-ph]").forEach(function (el) {
      var v = state.dict[el.getAttribute("data-i18n-ph")];
      if (v !== undefined) el.setAttribute("placeholder", v);
    });
    qsa("[data-lang-label]").forEach(function (el) {
      el.textContent = state.lang === "tr" ? "EN" : "TR";
    });
    document.dispatchEvent(new CustomEvent("wh:lang", { detail: state.lang }));
  }

  function setLang(lang) {
    state.lang = LANGS.indexOf(lang) > -1 ? lang : DEFAULT_LANG;
    try { localStorage.setItem("wh_lang", state.lang); } catch (e) { /* yok */ }
    return fetch("/i18n/" + state.lang + ".json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) { state.dict = d || {}; applyI18n(); })
      .catch(function () { state.dict = {}; applyI18n(); });
  }

  /* ---------- ürünler ---------- */
  function loadProducts() {
    return fetch("/products.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) { state.products = Array.isArray(list) ? list : []; })
      .catch(function () { state.products = []; });
  }

  function isBuyable(p) { return !!(p && p.active && p.gumroadUrl); }

  function buyButton(p, cls) {
    var a = document.createElement("a");
    a.className = "btn " + (cls || "btn-primary");
    if (isBuyable(p)) {
      a.href = checkoutUrl(p);
      a.rel = "noopener";
      a.textContent = t("cta.buy", "Satın Al") + " — " + money(p.price.amount, p.price.currency);
      a.addEventListener("click", function () { track("checkout_click", { slug: p.slug }); });
    } else {
      a.setAttribute("aria-disabled", "true");
      a.href = "#";
      a.textContent = t("products.soon", "Yakında");
      a.addEventListener("click", function (e) { e.preventDefault(); });
    }
    return a;
  }

  function renderCards(container) {
    container.innerHTML = "";
    if (!state.products.length) { container.hidden = true; return; }
    container.hidden = false;
    state.products.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "card product-card";

      var top = document.createElement("div");
      top.className = "top";
      var h3 = document.createElement("h3");
      var link = document.createElement("a");
      link.href = "/p.html?slug=" + encodeURIComponent(p.slug);
      link.textContent = p.title;
      h3.appendChild(link);
      top.appendChild(h3);
      if (p.badge) {
        var pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = (p.badge[state.lang] || p.badge.tr || "");
        top.appendChild(pill);
      }
      card.appendChild(top);

      if (p.subtitle) {
        var sub = document.createElement("p");
        sub.className = "muted small";
        sub.style.margin = "0";
        sub.textContent = p.subtitle[state.lang] || p.subtitle.tr || "";
        card.appendChild(sub);
      }

      var feats = p.features && (p.features[state.lang] || p.features.tr);
      if (feats && feats.length) {
        var ul = document.createElement("ul");
        feats.forEach(function (f) {
          var li = document.createElement("li");
          li.textContent = f;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      var buy = document.createElement("div");
      buy.className = "buy";
      var priceBox = document.createElement("div");
      var priceEl = document.createElement("div");
      priceEl.className = "price";
      priceEl.textContent = money(p.price.amount, p.price.currency);
      var note = document.createElement("div");
      note.className = "muted small";
      note.textContent = t("cta.once", "tek ödeme");
      priceBox.appendChild(priceEl);
      priceBox.appendChild(note);
      buy.appendChild(priceBox);
      buy.appendChild(buyButton(p, "btn-primary"));
      card.appendChild(buy);

      container.appendChild(card);
    });
  }

  function renderDetail(root) {
    var slug = param("slug");
    var p = state.products.filter(function (x) { return x.slug === slug; })[0] || state.products[0];
    if (!p) { root.innerHTML = ""; return null; }

    document.title = p.title + " · WizzyHax";
    qsa("[data-pd]", root).forEach(function (el) {
      var k = el.getAttribute("data-pd");
      if (k === "title") el.textContent = p.title;
      if (k === "subtitle") el.textContent = (p.subtitle && (p.subtitle[state.lang] || p.subtitle.tr)) || "";
      if (k === "price") el.textContent = money(p.price.amount, p.price.currency);
      if (k === "badge") el.textContent = (p.badge && (p.badge[state.lang] || p.badge.tr)) || "";
    });

    var feats = p.features && (p.features[state.lang] || p.features.tr);
    var list = qs("[data-pd=features]", root);
    if (list && feats) {
      list.innerHTML = "";
      feats.forEach(function (f) {
        var li = document.createElement("li");
        li.textContent = f;
        list.appendChild(li);
      });
    }

    var slot = qs("[data-pd=buy]", root);
    if (slot) {
      slot.innerHTML = "";
      var btn = buyButton(p, "btn-primary btn-lg");
      btn.classList.add("btn-block");
      slot.appendChild(btn);
      if (!isBuyable(p)) {
        var note = document.createElement("p");
        note.className = "small muted";
        note.style.margin = "10px 0 0";
        note.textContent = t("products.soonNote", "Satın alma yakında açılacak.");
        slot.appendChild(note);
      }
    }
    return p;
  }

  function mountStickyBar(p) {
    var bar = qs("#stickybar");
    if (!bar || !p) return;
    var name = qs("[data-bar=name]", bar);
    var price = qs("[data-bar=price]", bar);
    var slot = qs("[data-bar=buy]", bar);
    if (name) name.textContent = p.title;
    if (price) price.textContent = money(p.price.amount, p.price.currency);
    if (slot) {
      slot.innerHTML = "";
      var btn = buyButton(p, "btn-primary");
      btn.classList.add("btn-block");
      slot.appendChild(btn);
    }
  }

  function primaryProduct() {
    return state.products.filter(isBuyable)[0] || state.products[0] || null;
  }

  function mountSlots() {
    var p = primaryProduct();
    if (!p) return;
    qsa("[data-primary=price]").forEach(function (el) {
      el.textContent = money(p.price.amount, p.price.currency);
    });
    qsa("[data-primary=title]").forEach(function (el) { el.textContent = p.title; });
    qsa("[data-buy-slot]").forEach(function (el) {
      el.innerHTML = "";
      el.appendChild(buyButton(p, "btn-primary btn-lg"));
    });
  }

  /* ---------- sipariş sorgulama ---------- */
  function mountLookup() {
    var form = qs("#lookupForm");
    if (!form) return;
    var msg = qs("#lookupMsg");
    var out = qs("#lookupResult");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "msg";
      msg.textContent = "";
      out.innerHTML = "";

      var email = (qs("#lookupEmail").value || "").trim();
      var order = (qs("#lookupOrder").value || "").trim().toUpperCase();
      if (!email || !order) return;

      var btn = qs("button[type=submit]", form);
      btn.disabled = true;
      btn.textContent = "…";

      fetch("/api/siparis-sorgula", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, orderId: order })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (!res.ok || !res.data || !res.data.keys || !res.data.keys.length) {
            msg.className = "msg err";
            msg.textContent = t("ty.notfound", "Bu bilgilerle bir sipariş bulunamadı.");
            return;
          }
          res.data.keys.forEach(function (k) {
            var box = document.createElement("div");
            box.className = "keybox";
            var span = document.createElement("code");
            span.textContent = k.key;
            if (k.status !== "active") {
              span.style.opacity = ".5";
              span.textContent += " (" + t("ty.revoked", "iptal edildi") + ")";
            }
            box.appendChild(span);
            var copy = document.createElement("button");
            copy.className = "btn small";
            copy.type = "button";
            copy.textContent = t("ty.copy", "Kopyala");
            copy.addEventListener("click", function () {
              navigator.clipboard.writeText(k.key).then(function () {
                copy.textContent = t("ty.copied", "Kopyalandı");
                setTimeout(function () { copy.textContent = t("ty.copy", "Kopyala"); }, 1600);
              });
            });
            box.appendChild(copy);
            out.appendChild(box);
          });
          track("key_lookup_success", { keys: res.data.keys.length });
        })
        .catch(function () {
          msg.className = "msg err";
          msg.textContent = t("ty.error", "Bir şeyler ters gitti, tekrar dene.");
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = t("ty.submit", "Anahtarımı göster");
        });
    });
  }

  /* ---------- başlangıç ---------- */
  function boot() {
    var y = qs("#year");
    if (y) y.textContent = String(new Date().getFullYear());

    qsa("[data-lang-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(state.lang === "tr" ? "en" : "tr").then(rerender);
      });
    });

    setLang(pickLang())
      .then(loadProducts)
      .then(function () {
        rerender();
        mountLookup();
      });
  }

  function rerender() {
    mountSlots();
    var grid = qs("#productGrid");
    if (grid) renderCards(grid);
    var detail = qs("#productDetail");
    if (detail) {
      var p = renderDetail(detail);
      mountStickyBar(p);
    }
    var bar = qs("#stickybar");
    if (bar && !qs("#productDetail")) {
      var first = state.products.filter(isBuyable)[0] || state.products[0];
      if (first) mountStickyBar(first); else bar.style.display = "none";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
