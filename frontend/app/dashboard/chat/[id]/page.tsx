"use client";

import { useParams } from "next/navigation";
import ChatWindow from "@/components/chat-window";
import isAuth from "@/utils/isAuth";

export default function ChatConversationPage() {
  const params = useParams<{ id: string }>();

  return isAuth(
    <div>
      <ChatWindow conversationId={params.id} />
    </div>,
  );
}
