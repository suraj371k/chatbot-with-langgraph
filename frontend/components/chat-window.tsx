"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Square,
  Sparkles,
  User as UserIcon,
  Plus,
  FileStack,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
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

// Renders assistant/user markdown with real typography instead of raw,
// unstyled tags — headings, lists, code, and links all fall back to plain
// browser defaults without this.
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="pl-0.5">{children}</li>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">
      {children}
    </h2>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-3 text-[15px] font-semibold first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-2 border-border pl-3 italic text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[13px] last:mb-0">
      {children}
    </pre>
  ),
};

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-1.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
    </span>
  );
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
    documentsIds,
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
    } catch {
      // Clipboard API can fail on insecure contexts / permissions — not
      // worth surfacing an error banner for a copy button.
    }
  };

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus the composer once it's actually usable again, so sending a
  // message or switching conversations doesn't leave the user stuck
  // clicking back into the textarea.
  useEffect(() => {
    if (!isBusy && !historyLoading) {
      textareaRef.current?.focus();
    }
  }, [isBusy, historyLoading, conversationId]);

  const activeId = conversationId ?? activeConversationId;
  const activeChat = chats.find((c) => c.conversation_id === activeId);
  const chatTitle = activeChat?.name?.trim() || "New chat";
  const hasDocumentScope = !!documentsIds && documentsIds.length > 0;
  const showEmptyState = !historyLoading && messages.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-2rem)] w-full max-w-full flex-col overflow-hidden rounded-xl border border-border bg-background">
      {/* Header */}
      <div className="flex-none border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {chatTitle}
            </p>
            {hasDocumentScope && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <FileStack className="h-3 w-3" />
                Chatting with {documentsIds!.length} document
                {documentsIds!.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="New chat"
            onClick={() => router.push("/dashboard/chat")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Message list */}
      <div className="min-h-0 flex-1">
        {historyLoading ? (
          <div className="flex h-full flex-col gap-4 overflow-hidden px-4 py-4">
            {[70, 45, 60].map((width, i) => (
              <div
                key={i}
                className={cn(
                  "h-4 animate-pulse rounded-md bg-muted",
                  i % 2 === 0 ? "self-start" : "self-end",
                )}
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        ) : showEmptyState ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {hasDocumentScope
                  ? "Ask anything about your documents"
                  : "Start a conversation"}
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                The assistant can reference your uploaded documents, search
                the web, and remember context across chats.
              </p>
            </div>
          </div>
        ) : (
          <MessageScrollerProvider autoScroll>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className="px-4 py-4">
                  {messages.map((m) => {
                    const isStreamingThisMessage = streamingMessageId === m.id;
                    const isEmptyStreaming =
                      isStreamingThisMessage && m.content === "";

                    return (
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
                                "text-[15px]",
                                m.role === "user"
                                  ? "max-w-[75%] self-end rounded-2xl bg-primary px-4 py-2.5 leading-relaxed text-primary-foreground"
                                  : "max-w-[85%] self-start text-foreground",
                              )}
                            >
                              {isEmptyStreaming ? (
                                <TypingIndicator />
                              ) : m.role === "user" ? (
                                <span className="leading-relaxed">
                                  {m.content}
                                </span>
                              ) : (
                                <>
                                  <Markdown components={markdownComponents}>
                                    {m.content}
                                  </Markdown>
                                  {isStreamingThisMessage && (
                                    <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-muted-foreground" />
                                  )}
                                </>
                              )}
                            </div>

                            {m.role === "assistant" &&
                              m.content &&
                              !isStreamingThisMessage && (
                                <button
                                  onClick={() => handleCopy(m.id, m.content)}
                                  aria-label="Copy message"
                                  className="flex items-center gap-1 self-start text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/message:opacity-100"
                                >
                                  {copiedId === m.id ? (
                                    <>
                                      <Check className="h-3 w-3" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              )}
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    );
                  })}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
        )}
      </div>

      {error && (
        <div className="flex-none border-t border-border bg-destructive/5 px-4 py-2">
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        </div>
      )}

      {/* Composer */}
      <div className="flex-none border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 transition-colors focus-within:border-ring">
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
