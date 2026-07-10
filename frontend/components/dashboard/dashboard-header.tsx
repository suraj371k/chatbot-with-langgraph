"use client";

import { FileStack, Search, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const FEATURE_BADGES = [
  { label: "Multi-document RAG", icon: FileStack },
  { label: "Persistent memory", icon: Sparkles },
  { label: "Web-aware answers", icon: Search },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Hero banner introducing the multi-document AI chat workspace. */
export function DashboardHeader() {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-lime-400/5 p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime-400/10 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <p className="text-sm font-medium text-muted-foreground">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""} 👋
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Your multi-document AI workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Upload documents, chat across one or many of them at once, and pick
          up right where you left off — the assistant remembers context and
          key facts between conversations.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {FEATURE_BADGES.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-foreground/80 backdrop-blur"
            >
              <Icon className="h-3.5 w-3.5 text-lime-600 dark:text-lime-400" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
