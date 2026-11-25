# The Replication Notebook — Frontend

An editorial scientific notebook and interactive workbench presenting the empirical reproduction of **Simanjuntak, Robet & Hoki (JAIC 2025)**: *"A Comparative Study of ML and DL Models for Heart Disease Classification"*.

## Architecture & Routes

- **`/` (The Notebook Scroll):** Seven connected chapters with Tufte-style marginalia (`Sidenote`), animated scroll-linked ECG progress bar, custom D3 + SVG figures (`PatientCohortViz`, `FeatureDistChart`, `StripPlotChart`, `ConfusionDotsViz`, `TrainingCurvesChart`, `DumbbellChart`), and full method disclosure.
- **`/workbench` (Data Workbench):** Sortable numeric leaderboard, full 48-row Paper vs. Replication comparison matrix (with Markdown/CSV export), per-seed hyperparameter register, and confusion matrix inspector.
- **`/predict` (Consultation Sheet):** Live patient risk probe on an ECG grid background with caliper sliders, Seed-42 model probability strip, and synthetic `Cholesterol = 0` ghost displacement vectors. Gracefully enters an offline/waking state when run statically without the FastAPI server.

## Technical Details

- **Zero-Flash Dual Themes:** Light "Paper" (`#F3EEE4`, default) and Dark "Ward at Night" (`#12110F`), initialized synchronously in `index.html`.
- **Self-Hosted Variable Fonts:** `@fontsource-variable/fraunces`, `@fontsource-variable/instrument-sans`, and `@fontsource-variable/jetbrains-mono`.
- **Lightweight Chunks:** Route-based `React.lazy` splitting with manual vendor chunking for `d3-*`, `framer-motion`, `lucide-react`, and `zod`.

## Commands

```bash
npm install
npm run dev      # Dev server at http://localhost:5173 (proxies /api -> :8000)
npm run build    # Typecheck + production bundle in dist/
npm run lint     # Run oxlint across TypeScript/TSX sources
npm run api      # Start companion FastAPI server (requires trained models in api/models/)
```
