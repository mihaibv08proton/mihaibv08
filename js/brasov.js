/**
 * BOTO TIMES — Salut Brașov
 * Loads data/brasov.json (newest first, max 3 weekly editions).
 * Independent of days.json / 3-day window.
 */
(function () {
  "use strict";

  const DATA_URL = "data/brasov.json";
  const MAX_EDITIONS = 3;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hasText(v) {
    return v != null && String(v).trim() !== "";
  }

  function editionLabel(ed) {
    if (hasText(ed.week)) return String(ed.week).trim();
    if (hasText(ed.dateExact)) return String(ed.dateExact).trim();
    if (hasText(ed.titleExact)) return String(ed.titleExact).trim();
    return "Ediție";
  }

  function formatAuthors(authors) {
    if (authors == null) return "";
    if (Array.isArray(authors)) {
      return authors
        .map((a) => String(a ?? "").trim())
        .filter(Boolean)
        .join(", ");
    }
    return String(authors).trim();
  }

  function renderItem(item) {
    const title = hasText(item.title) ? String(item.title).trim() : "";
    if (!title) return "";

    const when = hasText(item.when) ? String(item.when).trim() : "";
    const where = hasText(item.where) ? String(item.where).trim() : "";
    const text = hasText(item.text) ? String(item.text).trim() : "";
    const link = hasText(item.link) ? String(item.link).trim() : "";

    const metaBits = [];
    if (when) metaBits.push(`<span class="brasov-item__when">${escapeHtml(when)}</span>`);
    if (where) metaBits.push(`<span class="brasov-item__where">${escapeHtml(where)}</span>`);

    const titleHtml = link
      ? `<a class="brasov-item__link" href="${escapeHtml(link)}" rel="noopener noreferrer" target="_blank">${escapeHtml(title)}</a>`
      : escapeHtml(title);

    return `
      <article class="brasov-item">
        <h4 class="brasov-item__title">${titleHtml}</h4>
        ${
          metaBits.length
            ? `<p class="brasov-item__meta">${metaBits.join(
                '<span class="brasov-item__sep" aria-hidden="true"> · </span>'
              )}</p>`
            : ""
        }
        ${text ? `<p class="brasov-item__text">${escapeHtml(text)}</p>` : ""}
      </article>`;
  }

  function renderSection(section, edIndex, secIndex) {
    const name = hasText(section.name) ? String(section.name).trim() : "";
    const items = Array.isArray(section.items) ? section.items : [];
    const itemsHtml = items.map(renderItem).filter(Boolean).join("");
    if (!name || !itemsHtml) return "";

    const emoji = hasText(section.emoji) ? String(section.emoji).trim() : "";
    const lead = hasText(section.lead) ? String(section.lead).trim() : "";
    const heading = emoji
      ? `<span class="brasov-section__emoji" aria-hidden="true">${escapeHtml(emoji)}</span> ${escapeHtml(name)}`
      : escapeHtml(name);

    const id = `brasov-sec-${edIndex}-${secIndex}`;
    return `
      <section class="section brasov-section" aria-labelledby="${id}">
        <h3 class="section__title section__title--sub" id="${id}">${heading}</h3>
        ${lead ? `<p class="brasov-section__lead">${escapeHtml(lead)}</p>` : ""}
        <div class="brasov-items">
          ${itemsHtml}
        </div>
      </section>`;
  }

  function renderEdition(ed, index) {
    const title = hasText(ed.titleExact) ? String(ed.titleExact).trim() : "Salut Brașov";
    const subtitle = hasText(ed.subtitleExact) ? String(ed.subtitleExact).trim() : "";
    const authors = formatAuthors(ed.authors);
    const dateExact = hasText(ed.dateExact) ? String(ed.dateExact).trim() : "";
    const week = hasText(ed.week) ? String(ed.week).trim() : "";
    const intro = hasText(ed.intro) ? String(ed.intro).trim() : "";
    const sourceUrl = hasText(ed.sourceUrl) ? String(ed.sourceUrl).trim() : "";
    const sections = Array.isArray(ed.sections) ? ed.sections : [];

    const subBits = [];
    if (dateExact) subBits.push(dateExact);
    if (week) subBits.push(week);

    const sectionsHtml = sections
      .map((s, i) => renderSection(s, index, i))
      .filter(Boolean)
      .join("");

    return `
      <div
        class="edition brasov-edition"
        id="brasov-edition-${index}"
        data-edition-index="${index}"
        role="tabpanel"
        aria-labelledby="brasov-tab-${index}"
      >
        <header class="edition__header">
          <h2 class="edition__label">${escapeHtml(title)}</h2>
          ${
            subtitle
              ? `<p class="brasov-edition__subtitle">${escapeHtml(subtitle)}</p>`
              : ""
          }
          ${
            subBits.length
              ? `<p class="edition__sub">${escapeHtml(subBits.join(" · "))}</p>`
              : ""
          }
          ${
            authors
              ? `<p class="brasov-edition__byline">${escapeHtml(authors)}</p>`
              : ""
          }
          ${intro ? `<p class="brasov-edition__intro">${escapeHtml(intro)}</p>` : ""}
          ${
            sourceUrl
              ? `<p class="brasov-edition__source"><a href="${escapeHtml(sourceUrl)}" rel="noopener noreferrer" target="_blank">Sursă →</a></p>`
              : ""
          }
        </header>
        ${
          sectionsHtml ||
          `<p class="state-msg">Nicio secțiune în această ediție.</p>`
        }
      </div>`;
  }

  function renderFilters(editions) {
    const btns = [
      `<button type="button" class="x-filter brasov-filter is-active" data-filter="all" aria-pressed="true">Toate</button>`,
    ].concat(
      editions.map((ed, i) => {
        const label = editionLabel(ed);
        return `<button type="button" class="x-filter brasov-filter" role="tab" id="brasov-tab-${i}" data-filter="${i}" aria-pressed="false" aria-controls="brasov-edition-${i}">${escapeHtml(label)}</button>`;
      })
    );
    return `
      <nav class="x-filters brasov-filters" aria-label="Filtrează după ediție" role="tablist">
        ${btns.join("")}
      </nav>`;
  }

  function wireFilters(root) {
    const filters = $$(".brasov-filter", root);
    const editions = $$(".brasov-edition", root);
    if (!filters.length) return;

    function apply(filter) {
      const needle = String(filter ?? "all");
      filters.forEach((btn) => {
        const on = btn.dataset.filter === needle;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      editions.forEach((panel) => {
        const idx = panel.dataset.editionIndex;
        const show = needle === "all" || idx === needle;
        panel.hidden = !show;
      });
    }

    filters.forEach((btn) => {
      btn.addEventListener("click", () => apply(btn.dataset.filter || "all"));
    });

    // Optional: ?ed=all|0|1|2 or #ed-1
    const params = new URLSearchParams(window.location.search);
    const q = params.get("ed");
    if (q != null && (q === "all" || /^\d+$/.test(q))) {
      apply(q);
      return;
    }
    const hash = (window.location.hash || "").replace(/^#/, "");
    const hm = hash.match(/^ed-(\d+|all)$/);
    if (hm) apply(hm[1]);
  }

  function formatUpdatedAt(iso) {
    if (!hasText(iso)) return "";
    const s = String(iso).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const months = [
        "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
        "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"
      ];
      const d = Number(m[3]);
      const mo = Number(m[2]);
      const y = Number(m[1]);
      if (mo >= 1 && mo <= 12) return `${d} ${months[mo - 1]} ${y}`;
    }
    return s;
  }

  function fillMasthead(meta, editions) {
    const title = "BOTO TIMES";
    document.title = "BOTO TIMES — Salut Brașov";
    const titleEl = $("#masthead-title");
    if (titleEl) titleEl.textContent = title;

    const eyebrow = $("#masthead-eyebrow");
    if (eyebrow) eyebrow.remove();
    const vol = $("#masthead-vol");
    if (vol) vol.remove();
    const subEl = $("#masthead-subtitle");
    if (subEl) subEl.remove();

    const footerName = $("#footer-name") || $(".footer__name");
    if (footerName) footerName.textContent = title;

    const dateEl = $("#masthead-date");
    if (dateEl) {
      const fromMeta = formatUpdatedAt(meta && meta.updatedAt);
      const fromEd = editions[0] && hasText(editions[0].dateExact)
        ? String(editions[0].dateExact).trim()
        : "";
      const label = fromMeta || fromEd || "Salut Brașov";
      dateEl.innerHTML = `<strong>${escapeHtml(label)}</strong>`;
    }

    const windowEl = $("#masthead-window");
    if (windowEl) windowEl.textContent = "Ediții săptămânale";
  }

  function showEmpty(main, message) {
    main.innerHTML = `
      <section class="site-section site-section--brasov" aria-labelledby="sec-brasov">
        <header class="site-section__header">
          <h2 class="site-section__title" id="sec-brasov">Salut Brașov</h2>
          <p class="site-section__deck">Evenimente · știri locale · săptămânal</p>
        </header>
        <p class="state-msg">${escapeHtml(message)}</p>
      </section>`;
  }

  async function init() {
    const main = $("#main");
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const editions = Array.isArray(data.editions)
        ? data.editions.slice(0, MAX_EDITIONS)
        : [];

      if (!editions.length) {
        fillMasthead(data.meta || {}, []);
        showEmpty(main, "Nicio ediție încă.");
        return;
      }

      fillMasthead(data.meta || {}, editions);

      main.innerHTML = `
        <section class="site-section site-section--brasov" aria-labelledby="sec-brasov">
          <header class="site-section__header">
            <h2 class="site-section__title" id="sec-brasov">Salut Brașov</h2>
            <p class="site-section__deck">Evenimente · știri locale · săptămânal</p>
          </header>
          ${renderFilters(editions)}
          <div class="editions brasov-editions">
            ${editions.map((ed, i) => renderEdition(ed, i)).join("")}
          </div>
        </section>
      `;

      wireFilters(main);
    } catch (err) {
      console.error(err);
      fillMasthead({}, []);
      showEmpty(main, "Nicio ediție încă.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
