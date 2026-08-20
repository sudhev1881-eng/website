import { useEffect, useState } from "react";

interface Prediction {
  status: "EMPTY" | "OCCUPIED" | "MOTION_DETECTED" | "SIGNAL_UNSTABLE";
  confidence: number;
  motion: boolean;
  timestamp: string;
}

const API_URL = process.env.EXPO_PUBLIC_CSI_API_URL ?? "http://localhost:8000";
const WS_URL = process.env.EXPO_PUBLIC_CSI_WS_URL ?? API_URL.replace(/^http/, "ws") + "/ws/status";

export function usePresenceStatus() {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/status`).then((res) => res.json()).then(setPrediction).catch(() => undefined);
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => setPrediction(JSON.parse(event.data));
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    return () => ws.close();
  }, []);

  return { prediction, connected };
}
