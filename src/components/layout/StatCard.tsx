import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, change, icon, className }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {change !== undefined ? (
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  isPositive ? "text-success" : "text-error",
                )}
              >
                {isPositive ? "+" : ""}
                {change}% from last month
              </p>
            ) : null}
          </div>
          {icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
