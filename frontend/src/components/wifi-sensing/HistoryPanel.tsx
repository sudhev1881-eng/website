"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PresencePrediction } from "@/services/wifi-sensing";

export function HistoryPanel({ history }: { history: PresencePrediction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.slice(0, 10).map((item, index) => (
            <div key={`${item.timestamp}-${index}`} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
              <div>
                <p className="font-semibold">{item.status.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{Math.round(item.confidence * 100)}%</p>
                <p className="text-xs text-muted-foreground">{item.motion ? "motion" : "still"}</p>
              </div>
            </div>
          ))}
          {!history.length ? <p className="text-sm text-muted-foreground">Waiting for live CSI predictions...</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(timestamp: string): string {
  if (!timestamp) return "--";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(timestamp));
}
