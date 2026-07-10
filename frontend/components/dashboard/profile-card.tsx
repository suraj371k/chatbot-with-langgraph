"use client";

import { Mail, CalendarDays, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Card showing the signed-in user's identity in a recruiter-friendly format. */
export function ProfileCard() {
  const { user, loading } = useAuthStore();

  if (loading && !user) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 ring-1 ring-foreground/5">
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="h-12 w-12">
          <AvatarFallback className="bg-lime-400 text-base font-semibold text-neutral-950">
            {getInitials(user?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{user?.name}</p>
          <Badge
            variant="outline"
            className="mt-0.5 gap-1 border-lime-500/30 bg-lime-400/10 text-[11px] text-lime-700 dark:text-lime-400"
          >
            <ShieldCheck className="h-3 w-3" />
            Active account
          </Badge>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate">{user?.email}</span>
        </div>
        {user?.created_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>Member since {format(parseISO(user.created_at), "MMMM yyyy")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
