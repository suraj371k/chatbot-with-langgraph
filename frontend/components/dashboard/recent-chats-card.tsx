"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { MessageCircle, ArrowRight, MessagesSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatStore } from "@/store/chatStore";

const PREVIEW_COUNT = 5;

/** Preview of the most recent conversations, linking through to the full
 * chats list and to starting a new chat. */
export function RecentChatsCard() {
  const router = useRouter();
  const { chats, chatsLoading } = useChatStore();

  const recentChats = [...chats]
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, PREVIEW_COUNT);

  return (
    <div className="rounded-xl border border-border bg-card ring-1 ring-foreground/5">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <p className="text-sm font-medium">Recent conversations</p>
          <p className="text-xs text-muted-foreground">
            Pick up where you left off
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs"
            onClick={() => router.push("/dashboard/chats")}
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-border">
        {chatsLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}

        {!chatsLoading && recentChats.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <MessagesSquare className="h-7 w-7 opacity-40" />
            <p className="text-sm">No conversations yet</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-1 gap-1.5"
              asChild
            >
              <Link href="/dashboard/chat">
                <Plus className="h-3.5 w-3.5" />
                Start a new chat
              </Link>
            </Button>
          </div>
        )}

        {!chatsLoading &&
          recentChats.map((chat) => (
            <Link
              key={chat.conversation_id}
              href={`/dashboard/chat/${chat.conversation_id}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {chat.name?.trim() || "New chat"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(chat.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
