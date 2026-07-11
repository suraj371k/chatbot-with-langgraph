"use client";

import {
  File,
  HistoryIcon,
  Home,
  LogOut,
  MessageCircle,
  Search,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import Chats from "./chats";
import { useEffect } from "react";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "New Chat", url: "/dashboard/chat", icon: MessageCircle },
  { title: "Chats", url: "/dashboard/chats", icon: HistoryIcon },
  { title: "Documents", url: "/dashboard/docs", icon: File },
];

const SIDEBAR_CHATS_LIMIT = 7;

export function AppSidebar() {
  const { open } = useSidebar();
  const { logout, user } = useAuthStore();

  const router = useRouter();

  const { fetchChats, chats, chatsLoading } = useChatStore();

  useEffect(() => {
    fetchChats();
  }, []);

  const sortedChats = [...chats].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const visibleChats = sortedChats.slice(0, SIDEBAR_CHATS_LIMIT);
  const hasMoreChats = chats.length > SIDEBAR_CHATS_LIMIT;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logout successful");
      router.push("/auth/login");
    } catch (error) {
      toast.error("error in logout");
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {open && (
          <SidebarHeader>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-lg font-semibold text-foreground">
                Chatbot
              </span>
            </div>
          </SidebarHeader>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Quick links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {/* recent chats */}
          <SidebarGroupLabel>Recents</SidebarGroupLabel>
          <SidebarGroupContent>
            {chatsLoading ? (
              <div className="flex flex-col gap-1 px-2 py-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded-md bg-sidebar-accent/40"
                    style={{ width: `${70 - i * 6}%` }}
                  />
                ))}
              </div>
            ) : chats.length > 0 ? (
              <SidebarMenu>
                {visibleChats.map((chat) => (
                  <Chats
                    key={chat.conversation_id}
                    conversationId={chat.conversation_id}
                    name={chat.name}
                  />
                ))}
                {hasMoreChats && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <a
                        href="/dashboard/chats"
                        className="text-xs text-sidebar-foreground/60"
                      >
                        <span>View all chats</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            ) : (
              <p className="px-2 py-1.5 text-xs text-sidebar-foreground/60">
                No chats yet
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarFallback className="rounded-lg bg-lime-400 text-neutral-950 font-medium">
              {user?.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-1 flex-col overflow-hidden">
            <p className="truncate text-sm font-medium text-neutral-100">
              {user?.name}
            </p>
            <p className="truncate text-xs text-neutral-400">{user?.email}</p>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            size="icon"
            className="h-8 w-8 shrink-0 text-neutral-500 hover:text-red-500"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
