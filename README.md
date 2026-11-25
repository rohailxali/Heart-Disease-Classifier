# ML Lab Project: Heart Disease Classification Replication

Independent replication and production verification of:  
**"A Comparative Study of ML and DL Models for Heart Disease Classification"**  
Simanjuntak, Robet & Hoki, *Journal of Applied Informatics and Computing (JAIC)*, 9(6), 2025, pp. 3405–3409.

---

## Architecture & System Overview

- **Core ML Pipeline (`replicate_heart.py`)**: Stratified 5-seed cross-validation across 6 models (Naïve Bayes, Decision Tree, Random Forest, Support Vector Machine, Logistic Regression, Deep Neural Network) on the Kaggle Heart Failure dataset (918 patients).
- **Data Export (`export_results.py`)**: Transforms empirical results into typed JSON contracts stored in `frontend/public/data/`.
- **Live Prediction API (`api/`)**: Lightweight FastAPI service serving seed-42 models with schema introspection, held-out test split sampling, and ensemble consensus voting.
- **Frontend Dashboard (`frontend/`)**: Production React 18 + Vite + Tailwind CSS dashboard with responsive charts, dark/light theme, and WCAG AA accessibility.

---

## Local Execution Guide

> **Note on Reproducibility:** The evaluated numbers in `results_heart/` represent the graded benchmark. Because TensorFlow operations are not bit-reproducible across CPU architectures, `replicate_heart.py` should **not** be re-run unless regenerating raw metrics from scratch.

### 1. Environment Setup

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd frontend; npm install; cd ..
```

**macOS / Linux (Bash):**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

---

### 2. Pipeline Execution Order

To run or refresh the data pipeline from scratch:

1. **Exploratory Data Analysis:**
   ```bash
   python eda_heart.py
   ```
   *Generates `eda_dist.png` and `eda_corr.png`.*

2. **Paper Replication (Graded benchmark - do not re-run if preserving graded results):**
   ```bash
   python replicate_heart.py
   ```
   *Outputs to `results_heart/`: `raw.csv`, `summary.csv`, `comparison.csv`, `best_params.csv`, `dnn_curve_seed*.csv`.*

3. **Generate Publication Figures:**
   ```bash
   python make_figures.py
   ```
   *Outputs to `figs/`.*

4. **Methodological Improvements (Bonus Variants):**
   ```bash
   python improve_heart.py
   ```
   *Generates `results_variants/raw_variant_b.csv` and `results_variants/summary.json`.*

5. **Publish Frontend Data Contracts:**
   ```bash
   python export_results.py
   ```
   *Compiles and writes all JSON datasets to `frontend/public/data/`.*

---

### 3. Running the Frontend Dashboard

From the `frontend/` directory:
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser. The dashboard is fully functional from static JSON.

---

### 4. Running the Live Prediction API

The API requires models to be trained and serialized to `api/models/` first:

1. **Train Seed-42 API Models:**
   ```bash
   python api/train_models.py --skip-dnn
   ```
   *Trains the 5 scikit-learn models (NB, DT, RF, SVM, LR) on the seed-42 split, validates their test accuracy against `results_heart/raw.csv`, and saves held-out test samples.*

2. **Start the FastAPI Server:**
   ```bash
   python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Or from `frontend/`: `npm run api`.*

The Vite development server automatically proxies `/api` requests to `http://127.0.0.1:8000`.

---

### 5. Automated Verification & Smoke Testing

Run the end-to-end smoke test suite to verify model integrity and API endpoints:
```bash
python scripts/smoke_test.py
```
This tests:
- Exact accuracy match between `api/models/*.joblib` and `results_heart/raw.csv`.
- `GET /` service info.
- `GET /api/health` scikit-learn version and model status.
- `GET /api/schema` feature specifications and dynamic zero-cholesterol statistics.
- `GET /api/samples?n=1` held-out test patient sampling.
- `POST /api/predict` multi-model consensus risk inference.

---

## Deployment Guide

### Option A: Render (Zero-Config Blueprint)

The repository includes a ready-to-use Render Blueprint (`render.yaml`):

1. Connect your repository to [Render](https://render.com).
2. Choose **New > Blueprint** and select `render.yaml`.
3. Render automatically:
   - Installs `requirements-api.txt`.
   - Builds the frontend via `npm run build`.
   - Trains the seed-42 inference models via `python api/train_models.py --skip-dnn`.
   - Starts Uvicorn serving both the FastAPI endpoints and the static frontend from a single web service (`SERVE_FRONTEND=1`).

---

### Option B: Docker Container

A multi-stage `Dockerfile` is provided for isolated production deployments:

1. **Build the Docker Image:**
   ```bash
   docker build -t heart-disease-replication .
   ```

2. **Run the Container:**
   ```bash
   docker run -d -p 8000:8000 --name heart-disease-app heart-disease-replication
   ```

3. Open **`http://localhost:8000`** to access the unified web dashboard and API.

---

### Option C: Static Hosting (Vercel, Netlify, GitHub Pages)

The dashboard is designed as a static-first application:
```bash
cd frontend
npm run build
```
Deploy the generated `frontend/dist/` directory to any static file hosting service. The dashboard will operate in static demonstration mode, with the Predict page gracefully indicating when a live API is not connected.

---

## Project Structure

```
ml-lab-project/
├── Dockerfile                  Multi-stage Docker container definition
├── render.yaml                 Render Blueprint configuration
├── requirements.txt            Complete environment package dependencies
├── requirements-api.txt        Lightweight API deployment dependencies
├── heart.csv                   Kaggle Heart Failure Prediction dataset (918 rows)
├── eda_heart.py                Exploratory data analysis & feature distributions
├── replicate_heart.py          Core cross-validation & paper replication
├── make_figures.py             Publication figures generator
├── paper_results.py            Single source of truth for published metrics
├── improve_heart.py            Exploratory bonus variants (Early stopping & Imputation)
├── export_results.py           JSON exporter for frontend contracts
├── results_heart/              Graded replication data (DO NOT modify or re-run)
├── results_variants/           Experimental improvements data
├── figs/                       Matplotlib summary figures
├── api/                        FastAPI service
│   ├── main.py                 API endpoints & CORS configuration
│   ├── train_models.py         Seed-42 model trainer (--skip-dnn, --strict)
│   └── models/                 Serialized .joblib models & test samples
├── scripts/
│   └── smoke_test.py           Automated end-to-end verification script
├── tools/
│   └── take_screenshots.cjs   Automated Playwright 32-screenshot capture tool
└── frontend/                   React 18 + TypeScript + Tailwind CSS application
    ├── index.html              HTML entry with zero-flash theme script
    ├── vite.config.ts          Vite build configuration & vendor chunk splitting
    ├── public/data/            Static JSON contracts generated from Python
    └── src/                    React component hierarchy & pages
```

---

## Academic Integrity & Disclosure

This project was developed with assistance from Google Antigravity to build and harden the web interface and API layer. All reported ML metrics, model architectures, hyperparameter grids, and data processing pipelines are produced directly by the project's own Python source code and verified against `results_heart/`.
