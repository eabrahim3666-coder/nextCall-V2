"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";

type ChatMessage = {
    id: string;
    role: "user" | "owner" | "error";
    content: string;
    at: string;
};

export default function ChatWidget({ businessId }: { businessId: string }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch("/api/chat/history")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data.messages)) setMessages(data.messages);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`private-business-${businessId}`);
        const handler = (msg: ChatMessage) => {
            if (msg?.role === "owner") setMessages((prev) => [...prev, msg]);
        };
        channel.bind("chat:new", handler);
        return () => {
            channel.unbind("chat:new", handler);
            pusher.unsubscribe(`private-business-${businessId}`);
        };
    }, [businessId]);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, open]);

    const send = async () => {
        const content = input.trim();
        if (!content || sending) return;
        setSending(true);
        setInput("");
        try {
            const res = await fetch("/api/chat/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: content }),
            });
            const data = await res.json();
            if (res.ok && data.message) {
                setMessages((prev) => [...prev, data.message]);
            } else {
                setMessages((prev) => [...prev, { id: `err_${Date.now()}`, role: "owner", content: data.error || "Failed to send. Try again.", at: new Date().toISOString() }]);
            }
        } catch {
            setMessages((prev) => [...prev, { id: `err_${Date.now()}`, role: "error", content: "Network error — message not sent.", at: new Date().toISOString() }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end gap-3">
            {open && (
                <div className="w-80 sm:w-96 h-[28rem] bg-[#0c0c0c] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                <MessageCircle className="h-4 w-4 text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Support Chat</p>
                                <p className="text-[10px] text-neutral-500">Replies go to your Telegram</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <p className="text-center text-xs text-neutral-600 mt-10">No messages yet. Your messages will be forwarded to your Telegram where you can reply.</p>
                        )}
                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${m.role === "user" ? "bg-indigo-600 text-white rounded-br-md" : m.role === "error" ? "bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-bl-md" : "bg-white/[0.06] border border-white/[0.06] text-neutral-200 rounded-bl-md"}`}>
                                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                    <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-indigo-200/70" : "text-neutral-600"}`}>{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-white/[0.08] flex items-center gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && send()}
                            placeholder="Type a message..."
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
                </div>
            )}

            <button
                onClick={() => setOpen(!open)}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 transition-all"
                aria-label="Support chat"
            >
                <MessageCircle className="h-6 w-6" />
            </button>
        </div>
    );
}