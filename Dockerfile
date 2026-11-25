# Multi-stage Dockerfile: Frontend Node build -> Python 3.12 slim runtime

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python Runtime Environment
FROM python:3.12-slim AS runtime
WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install lightweight API Python dependencies
COPY requirements-api.txt ./
RUN pip install --no-cache-dir -r requirements-api.txt

# Copy backend code, dataset, and results
COPY api/ ./api/
COPY heart.csv ./
COPY results_heart/ ./results_heart/
COPY results_variants/ ./results_variants/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Train seed-42 models for live inference (skips heavyweight TensorFlow)
RUN python api/train_models.py --skip-dnn

# Configure environment to serve frontend static files through FastAPI
ENV SERVE_FRONTEND=1
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start Uvicorn web server
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
