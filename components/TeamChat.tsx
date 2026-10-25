"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MessageItem, UserProfile } from "@/types/task";
import { supabase } from "@/lib/supabase";
import { Send, Users, Sparkles, MessageSquare } from "lucide-react";

interface TeamChatProps {
  teamId: string;
  currentUser: UserProfile;
}

interface OnlineUser {
  id: string;
  name: string;
}

export default function TeamChat({ teamId, currentUser }: TeamChatProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputContent, setInputContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Tải lịch sử tin nhắn của team
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoadingMessages(true);
      const res = await fetch(`/api/teams/${teamId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Failed to load team messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Thiết lập Supabase Realtime Channel: broadcast + presence
  useEffect(() => {
    const channel = supabase.channel(`team:${teamId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    // 1. Nhận tin nhắn mới tức thì
    channel.on("broadcast", { event: "new_message" }, (payload) => {
      if (payload?.payload) {
        const incomingMessage = payload.payload as MessageItem;
        setMessages((prev) => {
          // Tránh duplicate nếu chính mình gửi
          if (prev.some((m) => m.id === incomingMessage.id)) return prev;
          return [...prev, incomingMessage];
        });
      }
    });

    // 2. Typing indicator broadcast
    channel.on("broadcast", { event: "user_typing" }, (payload) => {
      const { userName, isTyping } = payload.payload || {};
      if (userName && userName !== currentUser.name) {
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(userName) ? prev : [...prev, userName];
          } else {
            return prev.filter((u) => u !== userName);
          }
        });
      }
    });

    // 3. Online Presence
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        for (const key in state) {
          const presences = state[key] as Array<{ id?: string; name?: string }>;
          if (presences && presences[0]?.name) {
            users.push({
              id: presences[0].id || key,
              name: presences[0].name,
            });
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [teamId, currentUser]);

  // Xử lý typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);

    // Gửi broadcast đang nhập
    try {
      const channel = supabase.channel(`team:${teamId}`);
      channel.send({
        type: "broadcast",
        event: "user_typing",
        payload: { userName: currentUser.name, isTyping: true },
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channel.send({
          type: "broadcast",
          event: "user_typing",
          payload: { userName: currentUser.name, isTyping: false },
        });
      }, 1500);
    } catch {
      // bỏ qua nếu kênh chưa sẵn sàng
    }
  };

  // Gửi tin nhắn
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputContent.trim();
    if (!content || isSending) return;

    try {
      setIsSending(true);
      setInputContent("");

      // Dừng typing indicator ngay lập tức
      try {
        const channel = supabase.channel(`team:${teamId}`);
        channel.send({
          type: "broadcast",
          event: "user_typing",
          payload: { userName: currentUser.name, isTyping: false },
        });
      } catch {
        // ignore
      }

      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[580px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Chat Header: Online presence indicator */}
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Team Real-time Chat
              <span className="flex items-center gap-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Messages are saved to DB & updated live across all members
            </p>
          </div>
        </div>

        {/* Online Members Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <Users className="w-3.5 h-3.5" />
          <span>
            {onlineUsers.length > 0 ? `${onlineUsers.length} online` : "1 online"}
          </span>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-zinc-50/30 dark:bg-zinc-950/20">
        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-xs">
            <Sparkles className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
            Loading chat history...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-xs text-center py-10">
            <MessageSquare className="w-10 h-10 stroke-[1.5] text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="font-semibold text-zinc-600 dark:text-zinc-400">
              No messages yet
            </p>
            <p className="text-[11px] text-zinc-400 max-w-xs mt-1">
              Start the discussion! Everyone currently in this team will see your messages in real time.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const senderInitial = (msg.sender?.name || "U").charAt(0).toUpperCase();

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div
                    className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold flex-shrink-0"
                    title={msg.sender?.name}
                  >
                    {senderInitial}
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-sm transition-all ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-xs"
                      : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-xs"
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      {msg.sender?.name || "Member"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                  <p
                    className={`text-[9px] mt-1 text-right ${
                      isMe ? "text-indigo-200" : "text-zinc-400"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {isMe && (
                  <div
                    className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
                    title={currentUser.name}
                  >
                    {senderInitial}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-5 py-1 text-[11px] text-zinc-500 italic bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
          </span>
          <span>{typingUsers.join(", ")} is typing...</span>
        </div>
      )}

      {/* Input box */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputContent}
          onChange={handleInputChange}
          placeholder="Type your message to the team..."
          className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none transition"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !inputContent.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
