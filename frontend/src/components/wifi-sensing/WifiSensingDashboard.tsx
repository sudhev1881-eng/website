"use client";

import { ShieldCheck } from "lucide-react";
import { ControlsPanel } from "./ControlsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { StatusCard } from "./StatusCard";
import { Timeline } from "./Timeline";
import { useWifiPresence } from "@/hooks/useWifiPresence";

export function WifiSensingDashboard() {
  const {
    prediction,
    statusLabel,
    history,
    timeline,
    device,
    connected,
    error,
    setSimulatorState,
    runCalibrationStep,
  } = useWifiPresence();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_35%),var(--color-background)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Wi-Fi CSI sensing</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Privacy-preserving room occupancy</h1>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Detects physical presence from Channel State Information changes. It does not collect camera footage, audio, GPS, Bluetooth tracking data, faces, or personal identity.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold shadow-card">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-rose-500"}`} />
            {connected ? "Live WebSocket" : "Connecting"}
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}. Start the Python backend on port 8000.</div> : null}

        <StatusCard prediction={prediction} statusLabel={statusLabel} connected={connected} />

        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Timeline items={timeline} />
            <HistoryPanel history={history} />
            <div className="rounded-2xl border border-border bg-background p-5 shadow-card">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-6 w-6 text-primary" />
                <div>
                  <h2 className="font-bold">Privacy boundary</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This prototype uses CSI amplitude and phase features to infer occupancy only. It cannot identify who is present and intentionally avoids cameras, microphones, GPS, Bluetooth tracking, and facial recognition.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <ControlsPanel device={device} onSimulatorState={setSimulatorState} onCalibrationStep={runCalibrationStep} />
        </section>
      </div>
    </main>
  );
}
