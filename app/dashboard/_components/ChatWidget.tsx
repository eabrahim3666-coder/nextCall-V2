"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, MessageCircle, Send, X } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";

type ChatMessage = {
    id: string;
    role: "user" | "owner" | "error";
    content: string;
    at: string;
    photo?: string;
};

const compressImage = (file: File, maxSize = 900, quality = 0.6): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
            img.src = String(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

export default function ChatWidget({ businessId }: { businessId: string }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
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

    const appendError = (text: string) =>
        setMessages((prev) => [...prev, { id: `err_${Date.now()}`, role: "error", content: text, at: new Date().toISOString() }]);

    const send = async (contentOverride?: string, photoOverride?: string) => {
        if (sending) return;
        const content = (contentOverride ?? input).trim();
        if (!content && !photoOverride) return;
        setSending(true);
        if (!contentOverride) setInput("");
        try {
            const res = await fetch("/api/chat/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: content, photo: photoOverride }),
            });
            const data = await res.json();
            if (res.ok && data.message) {
                setMessages((prev) => [...prev, data.message]);
            } else {
                appendError(data.error || "Failed to send. Try again.");
            }
        } catch {
            appendError("Network error — message not sent.");
        } finally {
            setSending(false);
        }
    };

    const handleAttach = async (file?: File | null) => {
        if (!file || !file.type.startsWith("image/")) return;
        try {
            const photo = await compressImage(file);
            await send("", photo);
        } catch {
            appendError("Could not process that image.");
        }
        if (fileRef.current) fileRef.current.value = "";
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
                                    {m.photo && (
                                        <img src={m.photo} alt="photo" className="rounded-lg max-h-48 w-auto mb-1.5" />
                                    )}
                                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                    <p className={`text-[10px] mt-1 ${m.role === "user" ? "text-indigo-200/70" : "text-neutral-600"}`}>{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-white/[0.08] flex items-center gap-2">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleAttach(e.target.files?.[0])}
                        />
                        <button
                            onClick={() => fileRef.current?.click()}
                            disabled={sending}
                            className="text-neutral-500 hover:text-white disabled:opacity-30 transition-colors p-1.5"
                            title="Send a photo"
                        >
                            <ImagePlus className="h-5 w-5" />
                        </button>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && send()}
                            placeholder="Type a message..."
                            className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50"
                        />
                        <button
                            onClick={() => send()}
                            disabled={sending || (!input.trim())}
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