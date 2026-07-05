"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Square, Sparkles, User as UserIcon } from "lucide-react";
import Markdown from "react-markdown";

import { useChatStore } from "@/store/chatStore";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function useAutoResizeTextarea(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [ref, value]);
}

interface ChatWindowProps {
  conversationId?: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const router = useRouter();

  const activeConversationId = useChatStore((s) => s.conversationId);

  const {
    chats,
    fetchChats,
    messages,
    sending,
    streamingMessageId,
    historyLoading,
    resolvingConversation,
    error,
    sendMessage,
    stopGenerating,
    loadConversation,
    resetConversation,
  } = useChatStore();

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(textareaRef, input);

  useEffect(() => {
    if (conversationId) {
      // Skip the refetch if the store already reflects this exact
      // conversation — this is the case right after a brand-new chat's
      // first reply resolves its id and we get navigated here. Without
      // this check, loadConversation wipes `messages` and re-fetches from
      // the server, causing a visible flash back to "Loading…" right
      // after the response you just watched stream in.
      if (useChatStore.getState().conversationId !== conversationId) {
        loadConversation(conversationId);
      }
    } else {
      resetConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId && activeConversationId) {
      router.replace(`/dashboard/chat/${activeConversationId}`);
    }
  }, [conversationId, activeConversationId, router]);

  const isBusy = sending || resolvingConversation;

  const handleSend = () => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  console.log(chats);

  return (
    <div className="mx-auto  flex h-[calc(100vh-2rem)] w-full max-w-full flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Header */}
      <div className="flex-none border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">Assistant</p>
      </div>

      {/* Message list */}
      <div className="min-h-0 flex-1">
        {historyLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading conversation…
          </div>
        ) : (
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className="px-4 py-4">
                  {messages.map((m) => (
                    <MessageScrollerItem
                      key={m.id}
                      messageId={m.id}
                      scrollAnchor={m.role === "user"}
                    >
                      <Message align={m.role === "user" ? "end" : "start"}>
                        <MessageAvatar>
                          <Avatar size="sm">
                            <AvatarFallback>
                              {m.role === "user" ? (
                                <UserIcon size={13} />
                              ) : (
                                <Sparkles size={13} />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                        <MessageContent>
                          <div
                            data-slot="bubble"
                            className={cn(
                              "text-[15px] leading-relaxed",
                              m.role === "user"
                                ? "max-w-[75%] self-end rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground"
                                : "max-w-[85%] self-start text-foreground",
                            )}
                          >
                            <Markdown>{m.content}</Markdown>
                            {streamingMessageId === m.id && (
                              <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-muted-foreground" />
                            )}
                          </div>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  ))}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>

      {error && (
        <p className="flex-none border-t border-border px-4 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Composer */}
      <div className="flex-none border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-ring">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message the assistant..."
            className="max-h-50 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          {streamingMessageId ? (
            <button
              onClick={stopGenerating}
              aria-label="Stop generating"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-80"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || isBusy}
              aria-label="Send message"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}
