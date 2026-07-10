"use client";

import { Brain, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatStore } from "@/store/chatStore";

const PREVIEW_COUNT = 6;

/** Surfaces a sample of what the AI has learned about the user across
 * conversations — a visible demo of the persistent-memory feature. */
export function MemoryHighlightsCard() {
  const { memories, memoriesLoading } = useChatStore();
  const preview = memories.slice(0, PREVIEW_COUNT);

  return (
    <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <Brain className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">What the AI remembers</p>
          <p className="text-xs text-muted-foreground">
            Learned automatically across your chats
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {memoriesLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-lg" />
          ))}

        {!memoriesLoading && preview.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing learned yet — chat a bit and this fills in automatically.
          </p>
        )}

        {!memoriesLoading &&
          preview.map((memory) => (
            <div
              key={memory.key}
              className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
              <span className="text-foreground/90">{memory.fact}</span>
            </div>
          ))}
      </div>

      {memories.length > PREVIEW_COUNT && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          +{memories.length - PREVIEW_COUNT} more remembered facts
        </p>
      )}
    </div>
  );
}
