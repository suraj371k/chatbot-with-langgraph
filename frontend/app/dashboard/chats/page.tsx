"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Ellipsis,
  MessageSquarePlus,
  MessagesSquare,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { useChatStore } from "@/store/chatStore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: diffDay > 365 ? "numeric" : undefined,
  });
}

interface ChatSummary {
  conversation_id: string;
  name: string | null;
  created_at: string;
}

interface ChatRowProps {
  chat: ChatSummary;
  index: number;
}

function ChatRow({ chat, index }: ChatRowProps) {
  const { deleteConversation, renameConversation } = useChatStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.name ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const title = chat.name?.trim() || "New chat";
  const href = `/dashboard/chat/${chat.conversation_id}`;

  const startRename = (e: Event) => {
    e.preventDefault();
    setDraftTitle(chat.name ?? "");
    setIsRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = draftTitle.trim();
    setIsRenaming(false);
    if (!trimmed || trimmed === (chat.name ?? "").trim()) return;

    const ok = await renameConversation(chat.conversation_id, trimmed);
    if (ok) toast.success("Chat renamed");
    else toast.error("Couldn't rename chat");
  };

  const confirmDelete = async () => {
    setDeleteOpen(false);
    setBusy(true);
    const ok = await deleteConversation(chat.conversation_id);
    setBusy(false);

    if (ok) toast.success("Chat deleted");
    else toast.error("Couldn't delete chat");
  };

  if (isRenaming) {
    return (
      <div className="px-4 py-2.5">
        <input
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitRename();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setIsRenaming(false);
            }
          }}
          className="h-9 w-full rounded-lg border border-ring bg-background px-3 text-sm text-foreground outline-none"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index, 8) * 0.02 }}
    >
      <Link
        href={href}
        aria-disabled={busy}
        className="group flex items-center justify-between gap-3 rounded-xl border border-transparent px-4 py-3.5 transition hover:border-border hover:bg-accent/60 aria-disabled:pointer-events-none aria-disabled:opacity-50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatRelativeTime(chat.created_at)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.preventDefault()}
              aria-label={`More options for ${title}`}
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover:opacity-100 data-[state=open]:bg-accent data-[state=open]:opacity-100"
            >
              <Ellipsis size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            onClick={(e) => e.stopPropagation()}
            align="end"
            className="w-40 "
          >
            <DropdownMenuItem onSelect={startRename}>
              <Pencil className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Link>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and its messages.
              This action can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

const ChatsPage = () => {
  const { chats, chatsLoading, fetchChats } = useChatStore();
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.trim().toLowerCase();
    return chats.filter((c) =>
      (c.name ?? "New chat").toLowerCase().includes(q),
    );
  }, [chats, query]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [filtered],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Your chats
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {chatsLoading
              ? "Loading\u2026"
              : `${chats.length} conversation${chats.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/chat")}
          className="gap-1.5"
        >
          <MessageSquarePlus size={16} />
          New chat
        </Button>
      </div>

      {/* Search */}
      {chats.length > 0 && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-9"
          />
        </div>
      )}

      {/* List */}
      {chatsLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-muted/60"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <MessagesSquare className="mb-3 size-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            {query ? "No chats match your search" : "No chats yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query
              ? "Try a different search term."
              : "Start a new conversation to see it here."}
          </p>
          {!query && (
            <Button
              onClick={() => router.push("/dashboard/chat")}
              variant="outline"
              className="mt-4 gap-1.5"
            >
              <MessageSquarePlus size={16} />
              New chat
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sorted.map((chat, i) => (
            <ChatRow key={chat.conversation_id} chat={chat} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatsPage;
