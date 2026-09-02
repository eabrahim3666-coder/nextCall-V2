"use client";

import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Search } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { playBeep } from "@/lib/beep";

type ChatMessage = {
    id: string;
    role: "user" | "owner" | "error";
    sender?: "business" | "admin";
    content: string;
    at: string;
    photo?: string;
};

type Conversation = {
    business_id: string;
    business_name: string;
    owner_name: string;
    plan: string;
    last_message: string;
    last_from: "you" | "business";
    last_at: string | null;
    unread: number;
};

const timeAgo = (iso: string | null) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return "now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function beep() {
    playBeep(880, 0.12, 0.4);
}

export default function AdminChatPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    const fetchList = async () => {
        try {
            const res = await fetch("/api/admin/chat/list");
            const data = await res.json();
            if (Array.isArray(data.conversations)) setConversations(data.conversations);
        } catch {
            /* ignore */
        }
    };

    const openThread = async (businessId: string) => {
        setSelectedId(businessId);
        setMessages([]);
        try {
            const res = await fetch(`/api/admin/chat/messages?business_id=${encodeURIComponent(businessId)}`);
            const data = await res.json();
            if (Array.isArray(data.messages)) setMessages(data.messages);
        } catch {
            /* ignore */
        }
        await fetchList();
    };

    useEffect(() => {
        fetchList();
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(() => {});
        }
    }, []);

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe("private-admin-chat");
        const handler = (payload: { message?: ChatMessage; business_id?: string; business_name?: string; sender_name?: string }) => {
            const msg = payload?.message;
            if (!msg) return;
            if (payload.business_id === selectedId) {
                setMessages((prev) => [...prev, msg]);
            }
            if (document.hidden && "Notification" in window && Notification.permission === "granted") {
                new Notification(`💬 ${payload.business_name || "Support message"}`, {
                    body: `${payload.sender_name || ""}: ${msg.content}`,
                });
            }
            beep();
            fetchList();
        };
        channel.bind("chat:new", handler);
        return () => {
            channel.unbind("chat:new", handler);
            pusher.unsubscribe("private-admin-chat");
        };
    }, [selectedId]);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages]);

    const send = async () => {
        const content = input.trim();
        if (!content || !selectedId || sending) return;
        setSending(true);
        setInput("");
        try {
            const res = await fetch("/api/admin/chat/reply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ business_id: selectedId, message: content }),
            });
            const data = await res.json();
            if (res.ok && data.message) {
                setMessages((prev) => [...prev, data.message]);
            } else {
                setMessages((prev) => [...prev, {
                    id: `err_${Date.now()}`,
                    role: "error",
                    content: data.error || "Failed to send.",
                    at: new Date().toISOString(),
                }]);
            }
        } catch {
            setMessages((prev) => [...prev, {
                id: `err_${Date.now()}`,
                role: "error",
                content: "Network error — reply not sent.",
                at: new Date().toISOString(),
            }]);
        } finally {
            setSending(false);
        }
        fetchList();
    };

    const filtered = conversations.filter(
        (c) =>
            c.business_name.toLowerCase().includes(search.toLowerCase()) ||
            c.business_id.toLowerCase().includes(search.toLowerCase())
    );
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
    const selected = conversations.find((c) => c.business_id === selectedId);

    return (
        <div className="flex h-[calc(100vh-100px)] gap-0 overflow-hidden bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            {/* Conversation list */}
            <div className="w-72 lg:w-80 border-r border-white/[0.06] flex flex-col flex-shrink-0">
                <div className="p-4 border-b border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-indigo-400" />
                            Support Chat
                        </h2>
                        {totalUnread > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {totalUnread} new
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-600" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search businesses..."
                            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 && (
                        <p className="text-center text-xs text-neutral-600 mt-10">No conversations yet.</p>
                    )}
                    {filtered.map((c) => (
                        <button
                            key={c.business_id}
                            onClick={() => openThread(c.business_id)}
                            className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${
                                selectedId === c.business_id ? "bg-indigo-500/[0.08]" : ""
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-semibold truncate ${selectedId === c.business_id ? "text-indigo-300" : "text-white"}`}>
                                    {c.business_name}
                                </p>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {(c.unread || 0) > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                            {c.unread}
                                        </span>
                                    )}
                                    <span className="text-[9px] text-neutral-600">{timeAgo(c.last_at)}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
                                {c.last_from === "you" ? "You: " : ""}{c.last_message || "No messages yet"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-white/[0.08] text-neutral-500">
                                    {c.plan}
                                </span>
                                {c.owner_name && <span className="text-[9px] text-neutral-600 truncate">{c.owner_name}</span>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Thread */}
            <div className="flex-1 flex flex-col min-w-0">
                {!selectedId ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                            <MessageCircle className="h-6 w-6 text-indigo-400" />
                        </div>
                        <p className="text-sm text-white font-medium">Select a conversation</p>
                        <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                            Messages from business owners will appear here in real time.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                            <p className="text-sm font-semibold text-white">{selected?.business_name || "Conversation"}</p>
                            <p className="text-[10px] text-neutral-500">
                                {selected?.owner_name ? `${selected.owner_name} · ` : ""}
                                {selected?.plan} plan · {selected?.business_id}
                            </p>
                        </div>

                        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 && (
                                <p className="text-center text-xs text-neutral-600 mt-10">No messages yet. Say hello!</p>
                            )}
                            {messages.map((m) => (
                                <div key={m.id} className={`flex ${m.sender === "business" ? "justify-start" : "justify-end"}`}>
                                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                                        m.sender === "business"
                                            ? "bg-white/[0.06] border border-white/[0.06] text-neutral-200 rounded-bl-md"
                                            : m.role === "error"
                                            ? "bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-bl-md"
                                            : "bg-indigo-600 text-white rounded-br-md"
                                    }`}>
                                        {m.photo && (
                                            <img src={m.photo} alt="photo" className="rounded-lg max-h-48 w-auto mb-1.5" />
                                        )}
                                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                        <p className={`text-[10px] mt-1 ${m.sender === "business" ? "text-neutral-600" : "text-indigo-200/70"}`}>
                                            {new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 border-t border-white/[0.08] flex items-center gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && send()}
                                placeholder="Reply as support..."
                                className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50"
                            />
                            <button
                                onClick={send}
                                disabled={sending || !input.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg p-2.5 transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}