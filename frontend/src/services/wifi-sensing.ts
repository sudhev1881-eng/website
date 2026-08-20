export type WifiStatus = "EMPTY" | "OCCUPIED" | "MOTION_DETECTED" | "SIGNAL_UNSTABLE";

export interface PresencePrediction {
  status: WifiStatus;
  confidence: number;
  motion: boolean;
  signal_quality: "GOOD" | "NOISY" | "UNSTABLE" | string;
  timestamp: string;
  last_change: string;
}

export interface DeviceStatus {
  connected: boolean;
  device_id: string;
  mode: string;
  state?: string;
  sample_rate_hz?: number;
  message: string;
}

export interface PredictionHistoryResponse {
  items: PresencePrediction[];
}

const DEFAULT_API = "http://localhost:8000";

export function wifiApiBase(): string {
  return (process.env.NEXT_PUBLIC_CSI_API_URL ?? DEFAULT_API).replace(/\/$/, "");
}

export function wifiWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_CSI_WS_URL;
  if (configured) return configured;
  return wifiApiBase().replace(/^http/, "ws") + "/ws/status";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${wifiApiBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { detail?: string; error?: string }).detail ?? (data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const wifiSensingApi = {
  status: () => request<PresencePrediction>("/api/status"),
  history: (limit = 100) => request<PredictionHistoryResponse>(`/api/history?limit=${limit}`),
  timeline: (limit = 300) => request<PredictionHistoryResponse>(`/api/timeline?limit=${limit}`),
  device: () => request<DeviceStatus>("/api/device/status"),
  setSimulatorState: (state: "EMPTY" | "OCCUPIED" | "MOTION" | "UNSTABLE") =>
    request<DeviceStatus>("/api/simulator/state", { method: "POST", body: JSON.stringify({ state }) }),
  trainingLabels: () => request<{ room_id: string; label_counts: Record<string, number> }>("/api/training/labels"),
  collectTraining: (label: string, sampleCount = 80) =>
    request<{ label: string; samples_saved: number }>("/api/training/collect", {
      method: "POST",
      body: JSON.stringify({ label, sample_count: sampleCount }),
    }),
  train: () => request<Record<string, unknown>>("/api/training/train", { method: "POST" }),
  calibrationStep: (step: string) =>
    request<{ step: string; status: string; metrics: Record<string, unknown> }>("/api/calibration/step", {
      method: "POST",
      body: JSON.stringify({ step }),
    }),
};
