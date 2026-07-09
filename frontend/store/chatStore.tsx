import { create } from "zustand";
import { api } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface ConversationSummary {
  conversation_id: string;
  name: string | null;
  created_at: string;
}

interface ChatState {
  messages: ChatMessage[];
  chats: ConversationSummary[];
  conversationId: string | null;
  documentsIds: string[] | null;
  sending: boolean;
  streamingMessageId: string | null;
  historyLoading: boolean;
  chatsLoading: boolean;
  resolvingConversation: boolean;
  error: string | null;

  setDocumentsIds: (ids: string[]) => void;
  setConversationId: (id: string | null) => void;
  resetConversation: () => void;
  fetchChats: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  sendMessage: (question: string) => Promise<void>;
  stopGenerating: () => void;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  renameConversation: (
    conversationId: string,
    title: string,
  ) => Promise<boolean>;
}

let activeAbortController: AbortController | null = null;

function extractSSEData(rawEvent: string): string {
  return rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  chats: [],
  conversationId: null,
  documentsIds: null,
  sending: false,
  streamingMessageId: null,
  historyLoading: false,
  chatsLoading: false,
  resolvingConversation: false,
  error: null,

  setConversationId: (id) => set({ conversationId: id }),

  setDocumentsIds: (ids) => set({ documentsIds: ids }),
  resetConversation: () => {
    activeAbortController?.abort();
    activeAbortController = null;
    set({
      messages: [],
      conversationId: null,
      sending: false,
      streamingMessageId: null,
      resolvingConversation: false,
      error: null,
    });
  },

  fetchChats: async () => {
    set({ chatsLoading: true });
    try {
      const res = await api.get("/api/chat/");
      set({ chats: res.data.conversations ?? [], chatsLoading: false });
    } catch {
      set({ chatsLoading: false });
    }
  },

  loadConversation: async (conversationId) => {
    set({
      historyLoading: true,
      error: null,
      messages: [],
      conversationId,
    });
    try {
      const res = await api.get(`/api/chat/messages/${conversationId}`);
      const messages: ChatMessage[] = (res.data.messages ?? []).map(
        (m: { role: "assistant" | "user"; content: string }, idx: number) => ({
          id: `${conversationId}-${idx}`,
          role: m.role,
          content: m.content,
        }),
      );
      set({ messages, historyLoading: false });
    } catch {
      set({
        historyLoading: false,
        error: "Couldn't load this conversation. Try refreshing.",
      });
    }
  },

  sendMessage: async (question) => {
    const trimmed = question.trim();
    if (!trimmed || get().sending || get().resolvingConversation) return;

    const isNewConversation = !get().conversationId;
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    set((state) => ({
      messages: [
        ...state.messages,
        { id: userMessageId, role: "user", content: trimmed },
        { id: assistantMessageId, role: "assistant", content: "" },
      ],
      sending: true,
      streamingMessageId: assistantMessageId,
      error: null,
    }));

    const controller = new AbortController();
    activeAbortController = controller;

    try {
      const res = await fetch(`${api.defaults.baseURL}/api/chat/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          conversation_id: get().conversationId ?? undefined,
          document_ids: get().documentsIds ?? undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const data = extractSSEData(rawEvent);
          if (data && data !== "[DONE]") {
            if (data.startsWith("Error: ")) {
              set({ error: data.slice(7) });
            } else {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + data }
                    : m,
                ),
              }));
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
      } else {
        console.error("error streaming chat response:", err);
        set({ error: "Something went wrong while generating a response." });
      }
    } finally {
      activeAbortController = null;

      if (isNewConversation) {
        set({ streamingMessageId: null, resolvingConversation: true });
        try {
          await get().fetchChats();
          const { chats } = get();
          if (chats.length > 0) {
            const latest = chats.reduce((a, b) =>
              new Date(a.created_at) > new Date(b.created_at) ? a : b,
            );
            set({ conversationId: latest.conversation_id });
          }
        } finally {
          set({ resolvingConversation: false, sending: false });
        }
      } else {
        set({ sending: false, streamingMessageId: null });
      }
    }
  },

  stopGenerating: () => {
    activeAbortController?.abort();
  },

  deleteConversation: async (conversationId) => {
    const previousChats = get().chats;

    set({
      chats: previousChats.filter((c) => c.conversation_id !== conversationId),
    });

    try {
      await api.delete(`/api/chat/${conversationId}`);

      if (get().conversationId === conversationId) {
        get().resetConversation();
      }
      return true;
    } catch (err) {
      console.error("error deleting conversation:", err);
      set({
        chats: previousChats,
        error: "Couldn't delete this chat. Try again.",
      });
      return false;
    }
  },

  renameConversation: async (conversationId, title) => {
    const trimmed = title.trim();
    if (!trimmed) return false;

    const previousChats = get().chats;

    set({
      chats: previousChats.map((c) =>
        c.conversation_id === conversationId ? { ...c, name: trimmed } : c,
      ),
    });

    try {
      await api.put(`/api/chat/${conversationId}`, { title: trimmed });
      return true;
    } catch (err) {
      console.error("error renaming conversation:", err);
      set({
        chats: previousChats,
        error: "Couldn't rename this chat. Try again.",
      });
      return false;
    }
  },
}));
