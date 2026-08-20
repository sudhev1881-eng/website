"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PresencePrediction } from "@/services/wifi-sensing";

const colors: Record<string, string> = {
  EMPTY: "bg-slate-400",
  OCCUPIED: "bg-emerald-500",
  MOTION_DETECTED: "bg-amber-500",
  SIGNAL_UNSTABLE: "bg-rose-500",
};

export function Timeline({ items }: { items: PresencePrediction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily occupancy timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-20 items-end gap-1 rounded-2xl border border-border bg-surface p-3">
          {items.slice(-96).map((item, index) => (
            <div
              key={`${item.timestamp}-${index}`}
              className={`${colors[item.status] ?? colors.SIGNAL_UNSTABLE} min-w-1 flex-1 rounded-t`}
              style={{ height: `${item.status === "EMPTY" ? 30 : item.status === "SIGNAL_UNSTABLE" ? 55 : item.motion ? 100 : 78}%` }}
              title={`${item.status} ${Math.round(item.confidence * 100)}%`}
            />
          ))}
          {!items.length ? <div className="flex-1 text-center text-sm text-muted-foreground">No timeline data yet</div> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(colors).map(([label, color]) => (
            <span key={label} className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${color}`} />{label.replace("_", " ")}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
