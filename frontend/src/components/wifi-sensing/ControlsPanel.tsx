"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type DeviceStatus, wifiSensingApi } from "@/services/wifi-sensing";

interface ControlsPanelProps {
  device: DeviceStatus | null;
  onSimulatorState: (state: "EMPTY" | "OCCUPIED" | "MOTION" | "UNSTABLE") => Promise<void>;
  onCalibrationStep: (step: string) => Promise<unknown>;
}

const calibrationSteps = [
  ["connect_device", "Connect sensing device"],
  ["select_room", "Select room"],
  ["collect_empty_baseline", "Collect empty baseline"],
  ["collect_occupied_baseline", "Collect occupied baseline"],
  ["train_model", "Train/calibrate model"],
  ["complete", "Show accuracy"],
] as const;

export function ControlsPanel({ device, onSimulatorState, onCalibrationStep }: ControlsPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    setMessage(null);
    try {
      const result = await action();
      setMessage(JSON.stringify(result));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Device connection status</CardTitle>
          <CardDescription>Prototype mode uses simulated CSI. Hardware can replace it through the collector interface.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-semibold">Mode:</span> {device?.mode ?? "unknown"}</p>
          <p><span className="font-semibold">Device:</span> {device?.device_id ?? "not connected"}</p>
          <p><span className="font-semibold">State:</span> {device?.state ?? "hardware"}</p>
          <p className="text-muted-foreground">{device?.message}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulator controls</CardTitle>
          <CardDescription>Switch the generated CSI pattern to test real-time state changes.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {(["EMPTY", "OCCUPIED", "MOTION", "UNSTABLE"] as const).map((state) => (
            <Button key={state} variant="outline" loading={busy === state} onClick={() => run(state, () => onSimulatorState(state))}>
              {state.replace("_", " ")}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calibration mode</CardTitle>
          <CardDescription>Wizard follows empty-room baseline, occupied samples, and model retraining.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {calibrationSteps.map(([step, label], index) => (
            <Button key={step} className="w-full justify-start" variant="ghost" loading={busy === step} onClick={() => run(step, () => onCalibrationStep(step))}>
              Step {index + 1}: {label}
            </Button>
          ))}
          {message ? <pre className="max-h-32 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-white">{message}</pre> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training mode</CardTitle>
          <CardDescription>Collect labeled samples for room empty, entering, standing, sitting, moving, and leaving.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {["EMPTY", "PERSON_ENTERS", "PERSON_STANDING", "PERSON_SITTING", "PERSON_MOVING", "PERSON_LEAVES"].map((label) => (
            <Button key={label} variant="outline" loading={busy === label} onClick={() => run(label, () => wifiSensingApi.collectTraining(label, 60))}>
              {label.replaceAll("_", " ")}
            </Button>
          ))}
          <Button className="sm:col-span-2" loading={busy === "train"} onClick={() => run("train", () => wifiSensingApi.train())}>Retrain model</Button>
        </CardContent>
      </Card>
    </div>
  );
}
