/**
 * BOTO TIMES
 * Loads data/days.json (newest first, max 3 days) and renders
 * ONE page section based on <body data-page="stiri|cupoane|gyh">.
 */
(function () {
  "use strict";

  const DATA_URL = "data/days.json";
  const STIRI_ORDER = ["Science", "AI", "Medicine", "Health"];
  const STIRI_LABELS = {
    Science: "Science · Știință",
    AI: "AI · Inteligență Artificială",
    Medicine: "Medicine · Medicină",
    Health: "Health · Sănătate"
  };

  const PAGE_TITLES = {
    stiri: "BOTO TIMES — Știri",
    cupoane: "BOTO TIMES — Cupoane / Reduceri",
    gyh: "BOTO TIMES — Grow Your Wealth"
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function getPage() {
    const raw = (document.body.dataset.page || "stiri").toLowerCase();
    if (raw === "cupoane" || raw === "gyh" || raw === "stiri") return raw;
    return "stiri";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shortDateLabel(isoDate) {
    const months = [
      "ian", "feb", "mar", "apr", "mai", "iun",
      "iul", "aug", "sep", "oct", "nov", "dec"
    ];
    const parts = String(isoDate).split("-").map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
    const [, m, d] = parts;
    return `${d} ${months[m - 1]}`;
  }

  function formatExpires(iso) {
    if (!iso) return "";
    const months = [
      "ian", "feb", "mar", "apr", "mai", "iun",
      "iul", "aug", "sep", "oct", "nov", "dec"
    ];
    const parts = String(iso).split("-").map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return iso;
    const [y, m, d] = parts;
    return `${d} ${months[m - 1]} ${y}`;
  }

  function normalizeSection(raw) {
    const s = String(raw || "").trim();
    const map = {
      science: "Science",
      știință: "Science",
      stiinta: "Science",
      ai: "AI",
      "inteligență artificială": "AI",
      "inteligenta artificiala": "AI",
      medicine: "Medicine",
      medicină: "Medicine",
      medicina: "Medicine",
      health: "Health",
      sănătate: "Health",
      sanatate: "Health"
    };
    return map[s.toLowerCase()] || (STIRI_ORDER.includes(s) ? s : s);
  }

  function getStiri(day) {
    if (Array.isArray(day.stiri)) return day.stiri;
    if (Array.isArray(day.articles)) return day.articles;
    return [];
  }

  function getCupoane(day) {
    return Array.isArray(day.cupoane) ? day.cupoane : [];
  }

  function getGyh(day) {
    return Array.isArray(day.gyh) ? day.gyh : [];
  }

  function getXPosts(day) {
    return Array.isArray(day.xPosts) ? day.xPosts : [];
  }

  function groupBySection(articles) {
    const groups = Object.fromEntries(STIRI_ORDER.map((k) => [k, []]));
    const other = [];
    (articles || []).forEach((a) => {
      const key = normalizeSection(a.section);
      if (groups[key]) groups[key].push(a);
      else other.push(a);
    });
    return { groups, other };
  }

  function renderFigure(article) {
    const src = article.image;
    const caption = article.imageCaption || article.caption || "";
    if (!src) return "";
    return `
      <div class="article__media">
        <figure class="article__figure">
          <img
            src="${escapeHtml(src)}"
            alt="${escapeHtml(caption || article.headline || "Ilustrație")}"
            loading="lazy"
            decoding="async"
            onerror="this.parentElement.innerHTML='<div class=\\'article__placeholder\\'>Imagine indisponibilă</div>'"
          />
          ${caption ? `<figcaption class="article__caption">${escapeHtml(caption)}</figcaption>` : ""}
        </figure>
      </div>`;
  }

  function renderSource(article) {
    const name = article.source || article.sourceName;
    const url = article.sourceUrl || article.url;
    if (!name && !url) return "";
    if (url) {
      return `<p class="article__source">Sursă: <a href="${escapeHtml(url)}" rel="noopener noreferrer" target="_blank">${escapeHtml(name || url)}</a></p>`;
    }
    return `<p class="article__source">Sursă: ${escapeHtml(name)}</p>`;
  }

  function renderArticle(article, isLead) {
    return `
      <article class="article${isLead ? " article--lead" : ""}">
        <div class="article__text">
          <p class="article__kicker">${escapeHtml(normalizeSection(article.section))}</p>
          <h3 class="article__headline">${escapeHtml(article.headline)}</h3>
          ${article.lead ? `<p class="article__lead">${escapeHtml(article.lead)}</p>` : ""}
          ${article.body ? `<p class="article__body">${escapeHtml(article.body)}</p>` : ""}
          ${renderSource(article)}
        </div>
        ${renderFigure(article)}
      </article>`;
  }

  function renderStiriSubsection(sectionKey, articles) {
    if (!articles || !articles.length) return "";
    const label = STIRI_LABELS[sectionKey] || sectionKey;
    const id = `sec-stiri-${sectionKey.toLowerCase()}`;
    return `
      <section class="section section--stiri-sub" aria-labelledby="${id}">
        <h3 class="section__title section__title--sub" id="${id}">${escapeHtml(label)}</h3>
        <div class="articles">
          ${articles.map((a, i) => renderArticle(a, i === 0)).join("")}
        </div>
      </section>`;
  }

  function renderCupon(cupon) {
    const text = cupon.text || cupon.details || "";
    const isExample = cupon.example === true || /exemplu/i.test(String(cupon.title || ""));
    const expires = formatExpires(cupon.expires);
    const store = cupon.store || "";
    const category = cupon.category || "";
    const link = cupon.link || "";

    const metaBits = [];
    if (store) metaBits.push(`<span class="cupon__store">${escapeHtml(store)}</span>`);
    if (category) metaBits.push(`<span class="cupon__category">${escapeHtml(category)}</span>`);
    if (expires) metaBits.push(`<span class="cupon__expires">Expiră: ${escapeHtml(expires)}</span>`);

    return `
      <article class="cupon${isExample ? " cupon--example" : ""}">
        <div class="cupon__text">
          <div class="cupon__badges">
            ${isExample ? `<span class="cupon__badge">Exemplu</span>` : ""}
          </div>
          <h3 class="cupon__title">${escapeHtml(cupon.title || "Ofertă")}</h3>
          ${text ? `<p class="cupon__details">${escapeHtml(text)}</p>` : ""}
          ${metaBits.length ? `<p class="cupon__meta">${metaBits.join('<span class="cupon__sep" aria-hidden="true"> · </span>')}</p>` : ""}
          ${
            link
              ? `<p class="cupon__link"><a href="${escapeHtml(link)}" rel="noopener noreferrer" target="_blank">Vezi oferta →</a></p>`
              : ""
          }
        </div>
      </article>`;
  }

  function renderCupoaneBlock(cupoane) {
    const id = "sec-cupoane";
    if (!cupoane.length) {
      return `
        <section class="site-section site-section--cupoane" aria-labelledby="${id}">
          <header class="site-section__header">
            <h2 class="site-section__title" id="${id}">Cupoane / Reduceri</h2>
            <p class="site-section__deck">Oferte și coduri promo · layout tipărit</p>
          </header>
          <p class="state-msg">Niciun cupon în această ediție.</p>
        </section>`;
    }
    return `
      <section class="site-section site-section--cupoane" aria-labelledby="${id}">
        <header class="site-section__header">
          <h2 class="site-section__title" id="${id}">Cupoane / Reduceri</h2>
          <p class="site-section__deck">Oferte și coduri promo · layout tipărit</p>
        </header>
        <div class="cupoane">
          ${cupoane.map(renderCupon).join("")}
        </div>
      </section>`;
  }

  function renderStiriBlock(articles, xPosts) {
    const { groups, other } = groupBySection(articles);
    const xHtml = renderXBlock(xPosts || []);
    const subs = STIRI_ORDER.map((k) => renderStiriSubsection(k, groups[k])).join("");
    const otherHtml = other.length ? renderStiriSubsection("Altele", other) : "";
    const empty =
      !STIRI_ORDER.some((k) => groups[k].length) && !other.length
        ? `<p class="state-msg">Niciun articol în această ediție.</p>`
        : "";
    const id = "sec-stiri";

    return `
      <section class="site-section site-section--stiri" aria-labelledby="${id}">
        <header class="site-section__header">
          <h2 class="site-section__title" id="${id}">Știri</h2>
          <p class="site-section__deck">Știință · IA · Medicină · Sănătate · X</p>
        </header>
        ${xHtml || ""}
        ${subs}
        ${otherHtml}
        ${empty}
      </section>`;
  }


  function renderXPost(post) {
    const handle = post.handle || post.author || "";
    const date = post.date || "";
    const url = post.statusUrl || post.url || "";
    const isThread = post.thread === true;
    const tweets = Array.isArray(post.tweets) && post.tweets.length
      ? post.tweets
      : [{ index: 1, text: post.text || "", url: url }];
    const badge = isThread
      ? `<span class="x-post__badge">Thread · ${tweets.length}</span>`
      : `<span class="x-post__badge">Post</span>`;
    const body = tweets
      .map((t, i) => {
        const n = t.index || i + 1;
        const label = isThread ? `<p class="x-post__part">${n}/${tweets.length}</p>` : "";
        const tUrl = t.url || url;
        return `<div class="x-post__tweet">
          ${label}
          <p class="x-post__text">${escapeHtml(t.text || "")}</p>
          ${tUrl ? `<p class="x-post__link"><a href="${escapeHtml(tUrl)}" rel="noopener noreferrer" target="_blank">Deschide pe X →</a></p>` : ""}
        </div>`;
      })
      .join("");
    return `<article class="x-post${isThread ? " x-post--thread" : ""}">
      <header class="x-post__head">
        <p class="x-post__handle">@${escapeHtml(String(handle).replace(/^@/, ""))}</p>
        ${date ? `<p class="x-post__date">${escapeHtml(date)}</p>` : ""}
        ${badge}
      </header>
      ${body}
    </article>`;
  }

  function renderXBlock(posts) {
    if (!posts.length) return "";
    return `
      <section class="section section--x" aria-labelledby="sec-x">
        <h3 class="section__title section__title--sub" id="sec-x">X · Postări</h3>
        <div class="x-list">
          ${posts.map(renderXPost).join("")}
        </div>
      </section>`;
  }

  function renderGyhItem(item) {
    const headline = item.headline || item.title || "Notă GYH";
    const summary = item.summary || item.body || "";
    let recommendations = item.recommendations || "";
    if (Array.isArray(recommendations)) {
      recommendations = recommendations.map((x) => `• ${x}`).join("\n");
    }
    const date = item.date || "";
    const sourceBlock = renderSource(item);

    return `
      <article class="gyh-item">
        <h3 class="gyh-item__headline">${escapeHtml(headline)}</h3>
        ${date ? `<p class="gyh-item__date">${escapeHtml(date)}</p>` : ""}
        ${summary ? `<div class="gyh-item__summary">${escapeHtml(summary)}</div>` : ""}
        ${
          recommendations
            ? `<aside class="gyh-item__recs" aria-label="Recomandări autor">
                <h4 class="gyh-item__recs-title">Recomandări autor</h4>
                <p class="gyh-item__recs-body">${escapeHtml(recommendations)}</p>
              </aside>`
            : ""
        }
        ${sourceBlock}
      </article>`;
  }

  function renderGyhBlock(items) {
    const id = "sec-gyh";
    if (!items.length) {
      return `
        <section class="site-section site-section--gyh" aria-labelledby="${id}">
          <header class="site-section__header">
            <h2 class="site-section__title" id="${id}">Grow Your Wealth</h2>
            <p class="site-section__deck">Note · analiză · recomandări autor</p>
          </header>
          <p class="state-msg">Nicio notă Grow Your Wealth în această ediție.</p>
        </section>`;
    }
    return `
      <section class="site-section site-section--gyh" aria-labelledby="${id}">
        <header class="site-section__header">
          <h2 class="site-section__title" id="${id}">Grow Your Wealth</h2>
          <p class="site-section__deck">Note · analiză · recomandări autor</p>
        </header>
        <div class="gyh-list">
          ${items.map(renderGyhItem).join("")}
        </div>
      </section>`;
  }

  function renderPageContent(day, page) {
    if (page === "cupoane") return renderCupoaneBlock(getCupoane(day));
    if (page === "gyh") return renderGyhBlock(getGyh(day));
    return renderStiriBlock(getStiri(day), getXPosts(day));
  }

  function renderEdition(day, index, page) {
    return `
      <div
        class="edition"
        id="edition-${escapeHtml(day.date)}"
        role="tabpanel"
        aria-labelledby="tab-${escapeHtml(day.date)}"
        ${index === 0 ? "" : "hidden"}
      >
        <header class="edition__header">
          <h2 class="edition__label">${escapeHtml(day.label)}</h2>
          <p class="edition__sub">${escapeHtml(day.edition || "")}</p>
        </header>
        ${renderPageContent(day, page)}
      </div>`;
  }

  function renderTabs(days) {
    return `
      <div class="day-tabs" role="tablist" aria-label="Ediții pe zile">
        ${days
          .map(
            (day, i) => `
          <button
            type="button"
            class="day-tab"
            role="tab"
            id="tab-${escapeHtml(day.date)}"
            aria-selected="${i === 0 ? "true" : "false"}"
            aria-controls="edition-${escapeHtml(day.date)}"
            tabindex="${i === 0 ? "0" : "-1"}"
            data-date="${escapeHtml(day.date)}"
          >
            ${i === 0 ? "Azi · " : ""}${escapeHtml(shortDateLabel(day.date))}
          </button>`
          )
          .join("")}
      </div>`;
  }

  function activateTab(tabs, panels, tab) {
    const date = tab.dataset.date;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => {
      p.hidden = p.id !== `edition-${date}`;
    });
    tab.focus({ preventScroll: true });
  }

  function wireTabs(root) {
    const tabs = $$(".day-tab", root);
    const panels = $$(".edition", root);

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tabs, panels, tab));
    });

    root.querySelector(".day-tabs")?.addEventListener("keydown", (e) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let next = i;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = tabs.length - 1;
      activateTab(tabs, panels, tabs[next]);
    });
  }

  function fillMasthead(meta, days, page) {
    const title = "BOTO TIMES";
    document.title = PAGE_TITLES[page] || title;
    $("#masthead-title").textContent = title;
    $("#masthead-eyebrow").textContent = "Broadsheet digital · Europe / Bucharest";
    $("#masthead-subtitle").textContent =
      meta.subtitle || "Știri · Cupoane / Reduceri · Grow Your Wealth";

    const footerName = $("#footer-name") || $(".footer__name");
    if (footerName) footerName.textContent = title;

    const today = days[0];
    $("#masthead-date").innerHTML = today
      ? `<strong>${escapeHtml(today.label)}</strong>`
      : "—";
    $("#masthead-window").textContent = `Ultimele ${meta.windowDays || 3} zile`;

    if (meta.brand) {
      const brand = $(".footer__brand");
      if (brand) brand.textContent = meta.brand;
    }
  }

  async function init() {
    const main = $("#main");
    const page = getPage();
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const windowDays = data.meta?.windowDays || 3;
      const days = Array.isArray(data.days) ? data.days.slice(0, windowDays) : [];

      if (!days.length) {
        main.innerHTML = `<p class="state-msg state-msg--error">Nu există ediții în days.json.</p>`;
        return;
      }

      fillMasthead(data.meta || {}, days, page);

      main.innerHTML = `
        ${renderTabs(days)}
        <div class="editions">
          ${days.map((d, i) => renderEdition(d, i, page)).join("")}
        </div>
      `;

      wireTabs(main);
    } catch (err) {
      console.error(err);
      main.innerHTML = `
        <p class="state-msg state-msg--error">
          Nu am putut încărca <code>data/days.json</code>.
          Deschide site-ul printr-un server local (nu ca fișier <code>file://</code>).
        </p>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
