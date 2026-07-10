"use client";

import { FileText, MessageCircle, Brain, Gauge } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";

interface StatsOverviewProps {
  documentCount: number;
  documentsLoading: boolean;
}

/** Top-row quick metrics: documents, conversations, memories, token usage. */
export function StatsOverview({
  documentCount,
  documentsLoading,
}: StatsOverviewProps) {
  const { chats, chatsLoading, memories, memoriesLoading } = useChatStore();
  const { usage, usageLoading } = useAuthStore();

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Documents"
        value={documentCount}
        hint="Uploaded & indexed"
        icon={FileText}
        accent="blue"
        loading={documentsLoading}
      />
      <StatCard
        label="Conversations"
        value={chats.length}
        hint="Across all documents"
        icon={MessageCircle}
        accent="lime"
        loading={chatsLoading}
      />
      <StatCard
        label="Memories saved"
        value={memories.length}
        hint="Facts the AI remembers"
        icon={Brain}
        accent="violet"
        loading={memoriesLoading}
      />
      <StatCard
        label="Tokens used today"
        value={usage ? `${usage.percentage_used}%` : "—"}
        hint={
          usage
            ? `${usage.tokens_used.toLocaleString()} / ${usage.limit.toLocaleString()}`
            : undefined
        }
        icon={Gauge}
        accent="amber"
        loading={usageLoading}
      />
    </div>
  );
}
