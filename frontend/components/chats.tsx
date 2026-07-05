"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "@/store/chatStore";

interface ChatsProps {
  conversationId: string;
  name: string | null;
}

const Chats = ({ conversationId, name }: ChatsProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { deleteConversation, renameConversation } = useChatStore();

  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(name ?? "");
  const [busy, setBusy] = useState(false);

  const href = `/dashboard/chat/${conversationId}`;
  const isActive = pathname === href;
  const title = name?.trim() || "New chat";

  const startRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraftTitle(name ?? "");
    setIsRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = draftTitle.trim();
    setIsRenaming(false);
    if (!trimmed || trimmed === (name ?? "").trim()) return;

    const ok = await renameConversation(conversationId, trimmed);
    if (ok) toast.success("Chat renamed");
    else toast.error("Couldn't rename chat");
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;

    setBusy(true);
    const ok = await deleteConversation(conversationId);
    setBusy(false);

    if (ok) {
      toast.success("Chat deleted");
      if (isActive) router.push("/dashboard/chat");
    } else {
      toast.error("Couldn't delete chat");
    }
  };

  if (isRenaming) {
    return (
      <SidebarMenuItem>
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
          className="h-8 w-full rounded-md border border-sidebar-ring bg-sidebar px-2 text-sm text-sidebar-foreground outline-none"
        />
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="pr-7"
        aria-disabled={busy}
      >
        <Link href={href} title={title}>
          <span className="truncate">{title}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label={`More options for ${title}`}>
            <Ellipsis />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-40">
          <DropdownMenuItem onClick={startRename}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export default Chats;
