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
    stiri: "BOTO TIMES — X",
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

  function formatXDate(iso) {
    if (!iso) return "";
    const s = String(iso).trim();
    // Already a short display string (e.g. 16.09.2026 …)
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return shortDateLabel(`${m[1]}-${m[2]}-${m[3]}`);
    return s;
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

  function collectXImages(item, tweet) {
    const urls = [];
    const push = (u) => {
      const s = String(u || "").trim();
      if (s && !urls.includes(s)) urls.push(s);
    };
    (Array.isArray(item.images) ? item.images : []).forEach(push);
    if (tweet) {
      (Array.isArray(tweet.images) ? tweet.images : []).forEach(push);
      if (tweet.image) push(tweet.image);
    }
    return urls;
  }

  function renderXImages(urls) {
    if (!urls.length) return "";
    return `<div class="x-post__media">${urls
      .map(
        (src) => `
      <figure class="x-post__figure">
        <img class="x-post__img" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async"
          referrerpolicy="no-referrer"
          onerror="this.parentElement.innerHTML='<div class=\\'article__placeholder\\'>Imagine indisponibilă</div>'" />
      </figure>`
      )
      .join("")}</div>`;
  }


  function formatXText(raw) {
    const text = String(raw || "").replace(/\r\n/g, "\n").trim();
    if (!text) return "";
    // If already has newlines, split on them; else try to break dense numbered lists
    let lines = text.split("\n").map((l) => l.trimEnd());
    if (lines.length === 1) {
      const one = lines[0];
      // Insert breaks before "1. 2. ..." patterns when jammed
      const broken = one
        .replace(/\s+(\d+)\.\s+/g, "\n$1. ")
        .replace(/\s+(>\s+)/g, "\n$1");
      lines = broken.split("\n").map((l) => l.trim()).filter(Boolean);
    } else {
      lines = lines.map((l) => l.trim()).filter((l) => l.length);
    }
    const blocks = [];
    let listItems = [];
    const flush = () => {
      if (!listItems.length) return;
      blocks.push(
        `<ol class="x-tweet__list">${listItems
          .map((li) => `<li>${escapeHtml(li)}</li>`)
          .join("")}</ol>`
      );
      listItems = [];
    };
    lines.forEach((line) => {
      const num = line.match(/^(\d+)\.\s+(.+)$/);
      if (num) {
        listItems.push(num[2]);
        return;
      }
      const bullet = line.match(/^[•\-\*]\s+(.+)$/);
      if (bullet) {
        listItems.push(bullet[1]);
        return;
      }
      flush();
      if (line.startsWith(">")) {
        blocks.push(
          `<blockquote class="x-tweet__quote">${escapeHtml(
            line.replace(/^>\s*/, "")
          )}</blockquote>`
        );
      } else {
        blocks.push(`<p class="x-tweet__p">${escapeHtml(line)}</p>`);
      }
    });
    flush();
    return `<div class="x-tweet__structured">${blocks.join("")}</div>`;
  }


  function renderXPost(item) {
    const handle = String(item.handle || item.author || "").replace(/^@/, "");
    const statusUrl = item.statusUrl || item.url || "";
    const dateLabel = formatXDate(item.date);
    const isThread = item.thread === true;
    const tweets = Array.isArray(item.tweets) ? item.tweets.slice() : [];
    tweets.sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
    if (!tweets.length && (item.text || statusUrl)) {
      tweets.push({ index: 1, text: item.text || "", url: statusUrl });
    }
    const n = tweets.length || 1;
    const topImages = collectXImages(item, null);

    const tweetsHtml = tweets
      .map((t) => {
        const idx = Number(t.index) || 0;
        const text = t.text || "";
        const tUrl = t.url || statusUrl;
        const indexLabel = isThread
          ? `<span class="x-tweet__index">${escapeHtml(String(idx))}/${escapeHtml(String(n))}</span>`
          : "";
        const tweetImages = collectXImages({ images: [] }, t);
        return `
          <div class="x-tweet">
            ${indexLabel}
            ${text ? `<div class="x-tweet__body">${formatXText(text)}</div>` : ""}
            ${renderXImages(tweetImages)}
            ${
              isThread && tUrl
                ? `<p class="x-tweet__link"><a href="${escapeHtml(tUrl)}" rel="noopener noreferrer" target="_blank">Deschide pe X →</a></p>`
                : ""
            }
          </div>`;
      })
      .join("");

    const metaBits = [];
    if (dateLabel) metaBits.push(`<span class="x-post__date">${escapeHtml(dateLabel)}</span>`);
    if (isThread) metaBits.push(`<span class="x-post__thread-label">Thread</span>`);
    if (statusUrl) {
      metaBits.push(
        `<a class="x-post__status" href="${escapeHtml(statusUrl)}" rel="noopener noreferrer" target="_blank">Vezi pe X →</a>`
      );
    }

    return `
      <article class="x-post${isThread ? " x-post--thread" : ""}">
        <header class="x-post__header">
          <p class="x-post__handle">@${escapeHtml(handle)}</p>
          ${
            metaBits.length
              ? `<p class="x-post__meta">${metaBits.join(
                  '<span class="x-post__sep" aria-hidden="true"> · </span>'
                )}</p>`
              : ""
          }
        </header>
        <div class="x-post__tweets">${tweetsHtml}</div>
        ${renderXImages(topImages)}
      </article>`;
  }

  function renderXBlock(items) {
    if (!items || !items.length) return "";
    const id = "sec-stiri-x";
    return `
      <section class="section section--stiri-sub x-block" aria-labelledby="${id}">
        <h3 class="section__title section__title--sub" id="${id}">X · Twitter</h3>
        <div class="x-list">
          ${items.map(renderXPost).join("")}
        </div>
      </section>`;
  }

  function renderStiriBlock(articles, xPosts) {
    const { groups, other } = groupBySection(articles);
    const subs = STIRI_ORDER.map((k) => renderStiriSubsection(k, groups[k])).join("");
    const otherHtml = other.length ? renderStiriSubsection("Altele", other) : "";
    const xHtml = renderXBlock(xPosts || []);
    const empty =
      !STIRI_ORDER.some((k) => groups[k].length) && !other.length && !(xPosts && xPosts.length)
        ? `<p class="state-msg">Niciun articol în această ediție.</p>`
        : "";
    const id = "sec-stiri";

    return `
      <section class="site-section site-section--stiri" aria-labelledby="${id}">
        <header class="site-section__header">
          <h2 class="site-section__title" id="${id}">X</h2>
          <p class="site-section__deck">Postări · Thread-uri</p>
        </header>
        ${subs}
        ${otherHtml}
        ${xHtml}
        ${empty}
      </section>`;
  }

function formatStructuredText(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let listItems = [];

    function flushList() {
      if (!listItems.length) return;
      blocks.push(
        `<ul class="gyh-struct__list">${listItems
          .map((li) => `<li>${li}</li>`)
          .join("")}</ul>`
      );
      listItems = [];
    }

    function inlineFormat(s) {
      // bold **...**
      return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }
      const heading = trimmed.match(/^\*\*(.+?)\*\*$/);
      if (heading) {
        flushList();
        blocks.push(
          `<h4 class="gyh-struct__heading">${escapeHtml(heading[1])}</h4>`
        );
        return;
      }
      const bullet = trimmed.match(/^[•\-\*]\s+(.+)$/);
      if (bullet) {
        listItems.push(inlineFormat(bullet[1]));
        return;
      }
      flushList();
      blocks.push(`<p class="gyh-struct__p">${inlineFormat(trimmed)}</p>`);
    });
    flushList();
    return `<div class="gyh-struct">${blocks.join("")}</div>`;
  }

  function formatRecommendations(raw) {
    if (Array.isArray(raw)) {
      raw = raw.map((x) => `• ${x}`).join("\n");
    }
    const text = String(raw || "").trim();
    if (!text) return "";
    const items = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[•\-\*]\s+/, ""));
    if (!items.length) return "";
    return `<ul class="gyh-item__recs-list">${items
      .map((li) => `<li>${escapeHtml(li)}</li>`)
      .join("")}</ul>`;
  }


    function renderGyhItem(item) {
    const headline = item.headline || item.title || "Notă GYH";
    const summary = item.summary || item.body || "";
    const recommendations = item.recommendations || "";
    const date = item.date || "";
    const sourceBlock = renderSource(item);
    const summaryHtml = formatStructuredText(summary);
    const recsHtml = formatRecommendations(recommendations);

    return `
      <article class="gyh-item">
        <h3 class="gyh-item__headline">${escapeHtml(headline)}</h3>
        ${date ? `<p class="gyh-item__date">${escapeHtml(date)}</p>` : ""}
        ${summaryHtml ? `<div class="gyh-item__summary">${summaryHtml}</div>` : ""}
        ${
          recsHtml
            ? `<aside class="gyh-item__recs" aria-label="Recomandări autor">
                <h4 class="gyh-item__recs-title">Recomandări autor</h4>
                ${recsHtml}
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
      meta.subtitle || "X · Cupoane / Reduceri · Grow Your Wealth";

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
