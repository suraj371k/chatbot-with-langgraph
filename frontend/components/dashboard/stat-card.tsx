"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "lime" | "blue" | "violet" | "amber";
  loading?: boolean;
}

const accentStyles: Record<NonNullable<StatCardProps["accent"]>, string> = {
  lime: "bg-lime-400/15 text-lime-600 dark:text-lime-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

/** A single metric tile used across the dashboard's stats overview strip. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "lime",
  loading,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 transition-shadow hover:shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          accentStyles[accent],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-6 w-14" />
        ) : (
          <p className="text-xl font-semibold leading-tight tracking-tight">
            {value}
          </p>
        )}
        {hint && !loading && (
          <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}
