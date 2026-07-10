"use client";

import { Zap, TimerReset } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";

function formatResetTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "< 1m";
}

/** Shows the user's rolling 24h token usage against their daily limit. */
export function TokenUsageCard() {
  const { usage, usageLoading } = useAuthStore();

  return (
    <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Zap className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Token usage</p>
          <p className="text-xs text-muted-foreground">Rolling 24-hour window</p>
        </div>
      </div>

      {usageLoading || !usage ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold tabular-nums">
              {usage.tokens_used.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">
              of {usage.limit.toLocaleString()} tokens
            </span>
          </div>
          <Progress
            value={usage.percentage_used}
            className="mt-2 h-2"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{usage.percentage_used}% used</span>
            <span className="flex items-center gap-1">
              <TimerReset className="h-3 w-3" />
              Resets in {formatResetTime(usage.reset_in_seconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
