"use client";

import { useParams } from "next/navigation";
import ChatWindow from "@/components/chat-window";

export default function ChatConversationPage() {
  const params = useParams<{ id: string }>();

  return (
    <div>
      <ChatWindow conversationId={params.id} />
    </div>
  );
}
