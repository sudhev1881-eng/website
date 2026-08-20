"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type DeviceStatus,
  type PresencePrediction,
  type WifiStatus,
  wifiSensingApi,
  wifiWsUrl,
} from "@/services/wifi-sensing";

const initialPrediction: PresencePrediction = {
  status: "SIGNAL_UNSTABLE",
  confidence: 0,
  motion: false,
  signal_quality: "UNSTABLE",
  timestamp: "",
  last_change: "",
};

export function useWifiPresence() {
  const [prediction, setPrediction] = useState<PresencePrediction>(initialPrediction);
  const [history, setHistory] = useState<PresencePrediction[]>([]);
  const [timeline, setTimeline] = useState<PresencePrediction[]>([]);
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    const [status, historyRes, timelineRes, deviceStatus] = await Promise.all([
      wifiSensingApi.status(),
      wifiSensingApi.history(50),
      wifiSensingApi.timeline(180),
      wifiSensingApi.device(),
    ]);
    setPrediction(status);
    setHistory(historyRes.items);
    setTimeline(timelineRes.items);
    setDevice(deviceStatus);
  }, []);

  useEffect(() => {
    let closed = false;
    refresh().catch((err: Error) => setError(err.message));

    const connect = () => {
      const socket = new WebSocket(wifiWsUrl());
      socketRef.current = socket;
      socket.onopen = () => {
        if (!closed) {
          setConnected(true);
          setError(null);
        }
      };
      socket.onmessage = (event) => {
        const next = JSON.parse(event.data) as PresencePrediction;
        setPrediction(next);
        setHistory((items) => [next, ...items].slice(0, 50));
        setTimeline((items) => [...items.slice(-179), next]);
      };
      socket.onerror = () => {
        if (!closed) setError("Live CSI WebSocket is unavailable");
      };
      socket.onclose = () => {
        setConnected(false);
        if (!closed) window.setTimeout(connect, 1500);
      };
    };

    connect();
    return () => {
      closed = true;
      socketRef.current?.close();
    };
  }, [refresh]);

  const setSimulatorState = useCallback(
    async (state: "EMPTY" | "OCCUPIED" | "MOTION" | "UNSTABLE") => {
      const nextDevice = await wifiSensingApi.setSimulatorState(state);
      setDevice(nextDevice);
      await refresh();
    },
    [refresh],
  );

  const runCalibrationStep = useCallback(
    async (step: string) => {
      const result = await wifiSensingApi.calibrationStep(step);
      await refresh();
      return result;
    },
    [refresh],
  );

  const statusLabel = useMemo(() => {
    const labels: Record<WifiStatus, string> = {
      EMPTY: "ROOM EMPTY",
      OCCUPIED: "PERSON DETECTED",
      MOTION_DETECTED: "MOTION DETECTED",
      SIGNAL_UNSTABLE: "SIGNAL UNSTABLE",
    };
    return labels[prediction.status] ?? prediction.status;
  }, [prediction.status]);

  return {
    prediction,
    statusLabel,
    history,
    timeline,
    device,
    connected,
    error,
    refresh,
    setSimulatorState,
    runCalibrationStep,
  };
}
