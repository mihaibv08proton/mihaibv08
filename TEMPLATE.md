# BOTO TIMES — locked template

Standing masthead and section rules. Do not reintroduce removed chrome.

## Masthead (all pages)

- **No** `Vol. I` (`#masthead-vol`).
- **No** Broadsheet / Europe / Bucharest eyebrow (`#masthead-eyebrow` / `.masthead__eyebrow`).
- Meta row: only **Ediție gratuită** (centered).
- Nameplate: Playfair **BOTO TIMES**.
- **No** masthead subtitle (`#masthead-subtitle` / `.masthead__subtitle`) — nothing under the nameplate except date row + section-rail.
- Keep the **section-rail** nav (X · Cupoane / Reduceri · Grow Your Wealth) so all three pages stay reachable.
- Meta description: e.g. `BOTO TIMES — X / Cupoane / Grow Your Wealth` (no “Broadsheet” wording).

## Separators

- Masthead top/bottom rules may stay (nameplate weight).
- `.site-section__header`: light **1px** top + bottom (not heavy double 4px rules).
- `.edition__header`: light 1px bottom.
- `.section__title--sub`: light single rules if used (Science/AI subsections). Avoid stacking with the site-section header.

## X page structure

- **One** section header only: title `X`, deck `Postări · Thread-uri`.
- Posts render in `.x-list` directly — **no** nested `X · Twitter` / `.section__title--sub` under that header.
- Optional `.x-filters` account chips (Toate + @handles) above `.x-list`; B&W only, derived from that day’s `xPosts`.

## Footer

- Keep only **BOTO TIMES** (`.footer__name`).
- **No** `.footer__note` (days.json / tipar line).
- **No** `.footer__brand` (`mihaibv08`).

## Pages

1. `index.html` — X / Postări  
2. `cupoane.html` — Cupoane / Reduceri  
3. `gyh.html` — Grow Your Wealth  

Tipar: B&W Playfair broadsheet feel; content from `data/days.json` only.
