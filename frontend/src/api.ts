/**
 * api.ts - Central API client with timeout support and configurable base URL.
 */

export const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Fetch wrapper with configurable timeout (defaults to 8 seconds).
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;

    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs / 1000}s`, 408);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface ApiHealthResponse {
  status: string;
  models_loaded: string[];
  dnn_available: boolean;
  test_samples_count: number;
  seed: number;
  sklearn_version?: string;
}

export async function checkApiHealth(): Promise<ApiHealthResponse> {
  const res = await fetchWithTimeout('/api/health');
  if (!res.ok) {
    throw new ApiError(`Health check failed with status ${res.status}`, res.status);
  }
  return res.json();
}

export async function fetchApiSchema() {
  const res = await fetchWithTimeout('/api/schema');
  if (!res.ok) {
    throw new ApiError(`Failed to fetch schema: ${res.status}`, res.status);
  }
  return res.json();
}

export async function fetchApiSamples(n: number = 1) {
  const res = await fetchWithTimeout(`/api/samples?n=${n}`);
  if (!res.ok) {
    throw new ApiError(`Failed to fetch sample: ${res.status}`, res.status);
  }
  return res.json();
}

export async function postPrediction(patientData: Record<string, unknown>) {
  const res = await fetchWithTimeout('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(errorData.detail || `Prediction failed (${res.status})`, res.status);
  }
  return res.json();
}
