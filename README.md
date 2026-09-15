# BOTO TIMES

Ziar static alb-negru (broadsheet american tipărit), cu **două secțiuni de site**:

1. **Știri** — Science · AI · Medicine · Health  
2. **Cupoane / Reduceri** — oferte, coduri promo, deal-uri

Interfața chrome e în română; tiparul rămâne quality-news B&W. Fără build, fără CMS — doar HTML/CSS/JS + JSON.

## Structură

```
research-ziar/
├── index.html          # Masthead + shell
├── css/style.css       # Tipar B&W, responsive (coloane desktop / stivă mobil)
├── js/app.js           # Încarcă days.json, tab-uri pe zile, Știri + Cupoane
├── data/days.json      # Ultimele 3 zile (cea mai recentă prima)
├── img/                # Placeholder-e grayscale (SVG)
│   ├── lab.svg
│   ├── circuit.svg
│   └── heartbeat.svg
├── vercel.json         # Opțional (Vercel); inofensiv pe GitHub Pages
└── README.md
```

## Fereastra rulantă de 3 zile

- `data/days.json` → array `days[]` cu **doar zilele vizibile**.
- Ordine: **cea mai recentă prima** (index 0 = „Azi”).
- `meta.windowDays` (implicit `3`) limitează câte ediții citește UI-ul.
- Hub-ul **nu** calculează calendarul: agentul / editorul menține fereastra în JSON.

### Cum adaugă un agent o zi nouă

1. Deschide `data/days.json`.
2. **Prepend** un obiect nou la începutul lui `days[]` (ziua de azi).
3. Completează `date` (`YYYY-MM-DD`), `label`, `edition`, `stiri[]`, `cupoane[]`.
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
  "cupoane": [ /* oferte / reduceri */ ]
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
  "title": "Vivobarefoot — 20% la Primus Lite III (exemplu)",
  "text": "Detalii ofertă…",
  "store": "Vivobarefoot",
  "link": "https://www.vivobarefoot.com/",
  "expires": "2026-09-30",
  "category": "Încălțăminte",
  "example": true
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
| `example` | opțional | `true` → badge „Exemplu” în UI |

## Rulează local

`fetch` nu merge pe `file://` — folosește un server HTTP:

```bash
cd /workspace/research-ziar   # sau calea ta locală
python3 -m http.server 8080
```

Deschide: [http://localhost:8080](http://localhost:8080)

## GitHub Pages

1. Pune conținutul acestui folder la rădăcina unui repo (sau în `/docs`).
2. Settings → Pages → Source: **Deploy from a branch** → branch `main` (sau `gh-pages`), folder `/` (sau `/docs`).
3. Site-ul e static: nu e nevoie de Action de build. `vercel.json` poate rămâne; Pages îl ignoră.
4. După push, așteaptă publicarea; URL tipic: `https://<user>.github.io/<repo>/`.

## Vercel (opțional)

Root = acest folder. `vercel.json` setează cache scurt pe `/data/*`.

## Branding

- Masthead / nameplate: **BOTO TIMES** (Playfair Display 900, NYT-style)
- Footer: **BOTO TIMES** · **mihaibv08**
- Secțiuni site: **Știri** · **Cupoane / Reduceri**

## Design

Pure black / white / gray — cerneală pe hârtie, tipar broadsheet american. Nameplate tip New York Times (serif greu, tracking discret). Fără accente color. Multi-coloană pe desktop pentru știri; grilă de cupoane tip „clipping”; o coloană pe mobil; tab-uri touch-friendly pentru cele 3 zile.
