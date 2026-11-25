# DESIGN.md — The Replication Notebook

**Concept:** Clinical laboratory notebook paired with long-form scientific journalism. Replaces generic SaaS/admin dashboard cards and sidebars with continuous narrative prose on warm paper surfaces, dense typographic data workbenches, and a clinical consultation probe.

---

## 1. Palette & Semantic Encoding

Two coordinated low-glare themes built via CSS custom properties (`src/index.css` & `tailwind.config.js`). Pure white (`#FFFFFF`) and pure black (`#000000`) are avoided to preserve eye comfort and paper texture.

| Token | Paper (Light Default) | Ward at Night (Dark) | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--color-bg` | `#F3EEE4` | `#12110F` | Primary reading background |
| `--color-surface` | `#FBF8F2` | `#1A1814` | Tables, consultation sheet, figure overlays |
| `--color-ink` | `#1B1A17` | `#EFE9DD` | Primary body copy, axis ticks, strong controls |
| `--color-muted` | `#6B655A` | `#9A9186` | Marginalia, unit captions, secondary labels |
| `--color-rule` | `#D9D1C1` | `#2E2B25` | 1px hairline rules replacing card walls |
| `--color-oxblood` | `#B4232C` | `#E0545C` | Heart disease, loss divergence, negative shifts |
| `--color-green` | `#1F6F5C` | `#4DB89A` | Healthy cohort, improvements above noise |
| `--color-ochre` | `#C98A1B` | `#E3A83B` | **Replication** (filled dot, ±1 SD band, artifact highlight) |
| `--color-ochre-ink` | `#8A5804` | `#E3A83B` | WCAG AA accessible text pairing for ochre accents |
| `--color-slate` | `#3F5B87` | `#8FA9D6` | **Paper baseline** (hollow dot), training curve |

### Visual Fixed Semantics
- **Paper (JAIC 2025 single run):** Always encoded as a **hollow slate circle** (`stroke: slate`, surface fill).
- **Replication (5-seed mean ± SD):** Always encoded as a **filled ochre circle** with `±1 SD` horizontal whisker and shaded tolerance band.
- **Disease vs Healthy:** Oxblood vs deep green across cohort dot plots, confusion clusters, feature histograms, and prediction probabilities.

---

## 2. Typography & Spatial Rhythm

Loaded locally via Fontsource variable packages (`@fontsource-variable/fraunces`, `@fontsource-variable/instrument-sans`, `@fontsource-variable/jetbrains-mono`):

- **Display (`Fraunces Variable`):** Optical sizing (`opsz`) and slight softness (`SOFT 30`) for editorial headlines and large tabular result numerals (`up to 112px`), anchored on `68ch` line measures (`min(68ch, calc(100% - 2.5rem))`).
- **Marginalia (`Fraunces Variable` Italic):** Paired with Tufte-style `<Sidenote>` placements—positioned in the outer right margin on wide desktop screens (`>= 1200px`) and toggled cleanly inline on phones and tablets.
- **Body (`Instrument Sans Variable`):** Crisp humanist sans for analytical prose and clinical labels (`16px` base, `1.65` line height).
- **Data (`JetBrains Mono Variable`):** Mandatory `tabular-nums` alignment across tables, confidence intervals, axis labels, and z-scores.

### Surface & Texture
- Inline SVG `<filter id="paper-noise-filter">` (`feTurbulence`) spans the viewport at `4%` opacity (`pointer-events: none`) to evoke physical bond paper without external image assets.
- `/predict` adopts `.ecg-grid-paper` (minor `16px` and major `80px` hairline grid lines) resembling clinical ECG recording strips.

---

## 3. Motion Rationale (`framer-motion`)

Motion serves clarity rather than ornament:
- **ECG Scroll Progress & Hero Trace:** `useScroll()` binds directly to SVG `pathLength` along the top edge (`EcgProgress`), paired with an initial `900ms` heartbeat draw beneath the Chapter I title.
- **Patient Cohort Regrouping (918 & 184 Dots):** Smooth CSS transform transitions (`680ms` cubic-bezier) preserve point identity as readers transition from whole cohort -> diagnosis split -> `Cholesterol == 0` fault line.
- **Hand-drawn Annotations:** Custom SVG strokes (`underline`, `circle`) draw once when entering the viewport (`whileInView`, `once: true`) to call out critical outliers (Seed-44 DNN collapse and the 88.4% zero-cholesterol rate).
- **Reduced Motion:** `useReducedMotion()` and `@media (prefers-reduced-motion: reduce)` disable translations/drawing loops and render static final states cleanly.

---

## 4. Component Inventory

| Component | Role |
| :--- | :--- |
| `TopBar` + `EcgProgress` | Slim sticky top bar with chapter links, route links, theme toggle, mobile slide-over sheet, and scroll-linked ECG line. |
| `Sidenote` | Margin commentary (`>= 1200px`) / expandable inline note (`< 1200px`). |
| `Figure` + `TableFallback` | Hairline-bounded figure frame with monospace source honesty note and hidden accessible data table. |
| `Numeral` | Viewport-triggered single-run Fraunces counter. |
| `Annotation` | Custom SVG underline, circle, and bracket highlight strokes with italic margin note. |
| `Button`, `Chip`, `SegmentedControl` | Sharp `2px`-radius clinical stamp UI controls with keyboard navigation. |
| `DataTable` | Sortable hairline table (`aria-sort`, `<caption>`, monospace alignment) powering `/workbench` and Chapter VII. |
| **Custom D3 + SVG Charts** | `PatientCohortViz` (918 dots), `FeatureDistChart`, `StripPlotChart`, `ConfusionDotsViz` (184 dots + `0.54 pp` flipper), `TrainingCurvesChart` (with oxblood overfitting gap), `DumbbellChart` (zero-based + explicit `//` axis break), and `/predict` `0–1` probability strip with `Cholesterol=0` ghost vectors. |
