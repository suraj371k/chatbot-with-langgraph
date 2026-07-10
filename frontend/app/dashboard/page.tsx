"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { TokenUsageCard } from "@/components/dashboard/token-usage-card";
import {
  RecentDocumentsCard,
  type RecentDocument,
} from "@/components/dashboard/recent-documents-card";
import { RecentChatsCard } from "@/components/dashboard/recent-chats-card";
import { MemoryHighlightsCard } from "@/components/dashboard/memory-highlights-card";

const RECENT_DOCUMENTS_LIMIT = 6;

const Dashboard = () => {
  const { fetchUsage } = useAuthStore();
  const { fetchChats, fetchMemories } = useChatStore();

  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
    fetchChats();
    fetchMemories();

    const loadRecentDocuments = async () => {
      setDocumentsLoading(true);
      try {
        const res = await api.get("/api/document", {
          params: { page: 1, limit: RECENT_DOCUMENTS_LIMIT },
        });
        setRecentDocuments(res.data.documents ?? []);
        setTotalDocuments(res.data.total ?? 0);
      } catch (err) {
        console.error("error fetching recent documents:", err);
      } finally {
        setDocumentsLoading(false);
      }
    };
    loadRecentDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <DashboardHeader />

      <StatsOverview
        documentCount={totalDocuments}
        documentsLoading={documentsLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <RecentDocumentsCard
            documents={recentDocuments}
            loading={documentsLoading}
          />
          <RecentChatsCard />
        </div>

        <div className="space-y-6">
          <ProfileCard />
          <TokenUsageCard />
          <MemoryHighlightsCard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
