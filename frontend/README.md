# Heart Disease ML Replication Frontend

An interactive, accessible React dashboard visualizing the empirical reproduction of **Simanjuntak et al. (JAIC 2025)**: *"A Comparative Study of ML and DL Models for Heart Disease Classification"*.

## Architecture & Features

- **Static-First Core**: Fully operable from precomputed JSON files in `public/data/` (no server required for benchmarking, exploratory data analysis, or methodology reports).
- **Interactive Risk Predictor**: Connects dynamically to the FastAPI live prediction service via `/api/predict` and `/api/samples`, gracefully reporting offline status with a server wake-up poll when the backend is asleep.
- **Accessible Design**: Built with Tailwind CSS, supporting dark/light mode with zero flash on load, WCAG AA contrast standards, keyboard-sortable data tables, and full screen-reader accessibility.
- **Optimized Bundle**: Dynamic code-splitting with `React.lazy`, manual vendor chunking for Recharts, Framer Motion, and Lucide icons, ensuring initial gzipped JavaScript stays well under 250 KB.

## Quick Start

### 1. Development Mode
```bash
npm install
npm run dev
```
The dashboard starts at `http://localhost:5173`. In development mode, Vite automatically proxies `/api` requests to `http://127.0.0.1:8000`.

### 2. Connect to the Live Prediction Backend
In a separate terminal:
```bash
npm run api
```
*(Starts Uvicorn serving `api.main:app` on port 8000).*

### 3. Build for Production
```bash
npm run build
```
Generates a static production bundle in `dist/`, ready for zero-configuration deployment to Netlify, Vercel, GitHub Pages, or Docker.

### 4. Code Quality & Linting
```bash
npm run lint
```
Runs `oxlint` across all TypeScript and React source files.
