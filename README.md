# BOTO TIMES

Ziar static alb-negru (broadsheet american tipărit), pe **trei pagini separate**:

1. **Știri** (`index.html`) — Science · AI · Medicine · Health  
2. **Cupoane / Reduceri** (`cupoane.html`) — oferte, coduri promo, deal-uri  
3. **Grow Your Wealth** (`gyh.html`) — note, sumar, recomandări autor

Interfața chrome e în română; tiparul rămâne quality-news B&W. Fără build, fără CMS — doar HTML/CSS/JS + JSON. Conținutul vine **doar** din `data/days.json` (nu se inventează știri/GYH).


## Locked template

See **[TEMPLATE.md](TEMPLATE.md)** for permanent masthead rules: no Vol. I, no Broadsheet Europe/Bucharest eyebrow, page-specific subtitles (`POSTĂRI X` / `CUPOANE / REDUCERI` / `GROW YOUR WEALTH`), single X section header, light separators, Playfair B&W.

## Structură

```
research-ziar/
├── index.html          # Știri (landing)
├── cupoane.html        # Cupoane / Reduceri
├── gyh.html            # Grow Your Wealth
├── css/style.css       # Tipar B&W, nav, responsive
├── js/app.js           # Citește days.json; randare pe pagina curentă (data-page)
├── data/days.json      # Ultimele 3 zile (cea mai recentă prima)
├── img/                # Placeholder-e grayscale (SVG)
├── vercel.json         # Opțional (Vercel); inofensiv pe GitHub Pages
└── README.md
```

Nav sub masthead: **Știri · Cupoane / Reduceri · Grow Your Wealth** (active pe pagina curentă). Tab-urile pe zile rămân pe fiecare pagină (fereastră de 3 zile).

## Fereastra rulantă de 3 zile

- `data/days.json` → array `days[]` cu **doar zilele vizibile**.
- Ordine: **cea mai recentă prima** (index 0 = „Azi”).
- `meta.windowDays` (implicit `3`) limitează câte ediții citește UI-ul.
- Hub-ul **nu** calculează calendarul: agentul / editorul menține fereastra în JSON.

### Cum adaugă un agent o zi nouă

1. Deschide `data/days.json`.
2. **Prepend** un obiect nou la începutul lui `days[]` (ziua de azi).
3. Completează `date` (`YYYY-MM-DD`), `label`, `edition`, `stiri[]`, `cupoane[]`, `gyh[]` (poate fi `[]`).
4. **Păstrează maxim 3** elemente în `days` — șterge ultima (cea mai veche).
5. Actualizează `meta.updatedAt` (ISO cu offset Europe/Bucharest, ex. `+03:00`).
6. Opțional: arhivează ziua scoasă în afara hub-ului.

### Schema unei zile

```json
{
  "date": "2026-09-15",
  "label": "Marți, 15 septembrie 2026",
  "edition": "Ediția de marți · Vol. I, Nr. 47",
  "stiri": [ /* articole Science/AI/Medicine/Health */ ],
  "cupoane": [ /* oferte / reduceri */ ],
  "gyh": [ /* note Grow Your Wealth; [] dacă nu există */ ]
}
```

Compatibilitate: `js/app.js` acceptă încă `articles` ca alias pentru `stiri`.

### Schema unui articol (în `stiri`)

```json
{
  "section": "Science",
  "headline": "Titlu",
  "lead": "Rezumat cursiv.",
  "body": "Corpul articolului.",
  "image": "img/lab.svg",
  "imageCaption": "Legendă sub imagine.",
  "source": "Nature",
  "sourceUrl": "https://www.nature.com/"
}
```

`section` acceptă: `Science` | `AI` | `Medicine` | `Health` (și variante RO/EN).  
`image` / `imageCaption` / `source` / `sourceUrl` sunt opționale.

### Schema unui cupon (în `cupoane`)

```json
{
  "title": "Ofertă magazin — reducere",
  "text": "Detalii ofertă…",
  "store": "Magazin",
  "link": "https://example.com/",
  "expires": "2026-09-30",
  "category": "Încălțăminte"
}
```

| Câmp | Obligatoriu | Note |
|------|-------------|------|
| `title` | da | Titlul ofertei |
| `text` sau `details` | recomandat | Descriere scurtă |
| `store` | recomandat | Magazin / brand |
| `link` | recomandat | URL ofertă |
| `expires` | opțional | `YYYY-MM-DD` |
| `category` | opțional | ex. Încălțăminte, Cod promo |
| `example` | opțional | `true` → badge „Exemplu” (evită în fereastra live) |

### Schema GYH (în `gyh`)

```json
{
  "headline": "Titlu notă",
  "summary": "Sumar complet, fără pierderi de conținut.",
  "recommendations": "Buy / sell / hold / staged — text recomandări autor.",
  "date": "2026-09-17",
  "source": "Autor / newsletter",
  "sourceUrl": "https://example.com/"
}
```

| Câmp | Obligatoriu | Note |
|------|-------------|------|
| `headline` sau `title` | da | Titlu |
| `summary` | recomandat | Corp / sumar lossless |
| `recommendations` | recomandat | Afișat în caseta „Recomandări autor” |
| `date` | opțional | |
| `source` / `sourceUrl` | opțional | |

Dacă `gyh` e gol, pagina arată: *Nicio notă Grow Your Wealth în această ediție.*

## Rulează local

`fetch` nu merge pe `file://` — folosește un server HTTP:

```bash
cd /workspace/research-ziar   # sau calea ta locală
python3 -m http.server 8080
```

Deschide:
- [http://localhost:8080/](http://localhost:8080/) — Știri  
- [http://localhost:8080/cupoane.html](http://localhost:8080/cupoane.html)  
- [http://localhost:8080/gyh.html](http://localhost:8080/gyh.html)

## GitHub Pages

1. Pune conținutul acestui folder la rădăcina unui repo (sau în `/docs`).
2. Settings → Pages → Source: **Deploy from a branch** → branch `main` (sau `gh-pages`), folder `/` (sau `/docs`).
3. Site-ul e static: nu e nevoie de Action de build. `vercel.json` poate rămâne; Pages îl ignoră.
4. După push, așteaptă publicarea; URL tipic: `https://<user>.github.io/<repo>/`.

## Vercel (opțional)

Root = acest folder. `vercel.json` setează cache scurt pe `/data/*`.

## Branding

- Masthead / nameplate: **BOTO TIMES** (Playfair Display, NYT-style — nu blackletter)
- Footer: **BOTO TIMES** · **mihaibv08**
- Pagini: **Știri** · **Cupoane / Reduceri** · **Grow Your Wealth**

## Design

Pure black / white / gray — cerneală pe hârtie, tipar broadsheet american. Nameplate tip New York Times (serif greu, tracking discret). Fără accente color. Multi-coloană pe desktop pentru știri; grilă de cupoane tip „clipping”; casetă „Recomandări autor” pe GYH; o coloană pe mobil; tab-uri touch-friendly pentru cele 3 zile.
