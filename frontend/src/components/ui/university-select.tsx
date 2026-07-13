"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export interface UniversityOption {
  id: string;
  name: string;
}

interface UniversitySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  /** Prefer parent-provided list to avoid duplicate fetches on the same page. */
  options?: UniversityOption[];
}

export function UniversitySelect({
  value,
  onValueChange,
  required,
  disabled,
  className,
  placeholder = "Select university",
  options: optionsProp,
}: UniversitySelectProps) {
  const [loaded, setLoaded] = React.useState<UniversityOption[]>([]);
  const [loading, setLoading] = React.useState(!optionsProp);

  React.useEffect(() => {
    if (optionsProp) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.universities
      .list()
      .then((rows) => {
        if (!cancelled) setLoaded(rows);
      })
      .catch(() => {
        if (!cancelled) setLoaded([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [optionsProp]);

  const options = optionsProp ?? loaded;
  const empty = !loading && options.length === 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-sm font-medium text-foreground">
        University
        {required ? <span className="text-error"> *</span> : null}
      </label>
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled || loading || empty}
        required={required}
      >
        <SelectTrigger aria-label="University">
          <SelectValue
            placeholder={
              loading ? "Loading colleges…" : empty ? "No colleges yet — ask admin" : placeholder
            }
          />
        </SelectTrigger>
        <SelectContent>
          {options.map((u) => (
            <SelectItem key={u.id} value={u.name}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {empty ? (
        <p className="text-xs text-muted-foreground">
          An admin must add colleges under Admin → Universities before students can register.
        </p>
      ) : null}
    </div>
  );
}
