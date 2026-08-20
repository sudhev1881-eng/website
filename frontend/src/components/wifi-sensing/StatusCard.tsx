"use client";

import { Activity, AlertTriangle, Radio, UserCheck, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type PresencePrediction } from "@/services/wifi-sensing";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  prediction: PresencePrediction;
  statusLabel: string;
  connected: boolean;
}

const statusStyles = {
  EMPTY: "from-slate-500 to-slate-700",
  OCCUPIED: "from-emerald-500 to-teal-700",
  MOTION_DETECTED: "from-amber-400 to-orange-700",
  SIGNAL_UNSTABLE: "from-rose-500 to-red-800",
};

export function StatusCard({ prediction, statusLabel, connected }: StatusCardProps) {
  const Icon = prediction.status === "EMPTY" ? Radio : prediction.status === "SIGNAL_UNSTABLE" ? AlertTriangle : prediction.motion ? Activity : UserCheck;
  const confidence = Math.round(prediction.confidence * 100);

  return (
    <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-2xl">
      <CardContent className={cn("relative bg-gradient-to-br p-8 md:p-10", statusStyles[prediction.status] ?? statusStyles.SIGNAL_UNSTABLE)}>
        <div className="absolute right-6 top-6 opacity-20">
          <Waves className="h-32 w-32" />
        </div>
        <div className="relative flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Room status</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{statusLabel}</h1>
            </div>
            <div className="rounded-full bg-white/15 p-5 backdrop-blur">
              <Icon className="h-12 w-12" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Metric label="Confidence" value={`${confidence}%`} />
            <Metric label="Motion" value={prediction.motion ? "Detected" : "Not detected"} />
            <Metric label="Signal" value={prediction.signal_quality.replace("_", " ")} />
            <Metric label="Device" value={connected ? "Live" : "Offline"} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
