"use client";

import { useState, useEffect, useRef, startTransition } from "react";

type Notification = {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
};

const TYPE_STYLES: Record<string, { badge: string; badgeText: string }> = {
    hot_lead: { badge: "bg-rose-500/20 text-rose-300", badgeText: "HOT" },
    emergency: { badge: "bg-rose-500/20 text-rose-300", badgeText: "URGENT" },
    appointment: { badge: "bg-emerald-500/20 text-emerald-300", badgeText: "NEW" },
    missed_call: { badge: "bg-amber-500/20 text-amber-300", badgeText: "MISSED" },
    minutes_80: { badge: "bg-amber-500/20 text-amber-300", badgeText: "WARNING" },
    minutes_90: { badge: "bg-rose-500/20 text-rose-300", badgeText: "ALERT" },
    minutes_100: { badge: "bg-rose-500/20 text-rose-300", badgeText: "LIMIT" },
};

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    // Real clock for time-ago stamps — starts at mount (was 0, so every
    // notification showed "Just now" for the first minute) and ticks hourly
    // updates at 60s.
    const [now, setNow] = useState(() => Date.now());
    const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // silently fail
        }
    };

    useEffect(() => {
        startTransition(() => {
            fetchNotifications();
        });

        // 1. Fetch when the user comes back to the app/tab (Crucial for Play Store/PWA)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startTransition(() => { fetchNotifications(); });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 2. Gentle background refresh (2 mins instead of 30s to save battery)
        const interval = setInterval(() => {
            startTransition(() => { fetchNotifications(); });
        }, 120000);

        // 3. Update time-ago stamps every minute (plus one immediate tick)
        const tick = () => setNow(Date.now());
        const timeInterval = setInterval(tick, 60000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, []);

    // Close the dropdown when clicking anywhere outside it (or pressing Escape)
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKey);
        };
    }, [open]);

    const markAllRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mark_all_read" }),
            });
            setUnreadCount(0);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        } catch {
            // silently fail
        }
    };

    const markRead = async (id: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mark_read", notification_id: id }),
            });
            setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // silently fail
        }
    };

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const target = notifications.find((n) => n._id === id);
        try {
            await fetch("/api/notifications", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notification_id: id }),
            });
            setNotifications((prev) => prev.filter((n) => n._id !== id));
            if (target && !target.read) setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // silently fail
        }
    };

    const timeAgo = (dateStr: string) => {
        const diff = now - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => {
                    if (!open) fetchNotifications(); // Refresh list when opening
                    setOpen(!open);
                }}
                className="relative p-2 text-[#A7ADBB] hover:text-white transition-colors"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <span className="flex items-center gap-2 text-xs font-semibold text-white">
                            Notifications
                            {unreadCount > 0 && <span className="text-[10px] font-normal text-[#A7ADBB]">({unreadCount} unread)</span>}
                        </span>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-[10px] text-[#ff4b00] hover:text-[#ff4b00] transition-colors">
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-xs text-neutral-600">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const style = TYPE_STYLES[n.type] || { badge: "bg-neutral-500/20 text-neutral-300", badgeText: "INFO" };
                                return (
                                    <div
                                        key={n._id}
                                        onClick={() => { setSelectedNotif(n); if (!n.read) markRead(n._id); }}
                                        className={`group relative flex items-start gap-3 pl-4 pr-3 py-3.5 border-b border-white/[0.04] cursor-pointer transition-colors ${n.read
                                            ? "hover:bg-black"
                                            : "bg-[#ff4b00]/[0.07] hover:bg-[#ff4b00]/[0.11]"}`}
                                    >
                                        {!n.read && (
                                            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-400" />
                                        )}
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${style.badge} flex-shrink-0 mt-0.5`}>{style.badgeText}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-xs truncate ${n.read ? "text-[#A7ADBB] font-normal" : "text-white font-semibold"}`}>{n.title}</span>
                                                <span className="text-[9px] text-neutral-600 flex-shrink-0">{timeAgo(n.created_at)}</span>
                                            </div>
                                            <p className={`text-[11px] mt-0.5 leading-relaxed line-clamp-2 ${n.read ? "text-neutral-600" : "text-[#A7ADBB]"}`}>{n.message}</p>
                                        </div>
                                        <button
                                            aria-label="Delete notification"
                                            onClick={(e) => deleteNotification(n._id, e)}
                                            className={`flex-shrink-0 p-1 rounded-md transition-all ${n.read ? "opacity-0 group-hover:opacity-100" : "opacity-40 group-hover:opacity-100"} text-[#A7ADBB] hover:text-rose-400 hover:bg-white/[0.06]`}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Notification detail modal */}
            {selectedNotif && (
                <div
                    className="fixed inset-0 z-[100] flex items-start justify-center pt-12 px-4 pb-4"
                    onClick={() => setSelectedNotif(null)}
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                {(() => {
                                    const s = TYPE_STYLES[selectedNotif.type] || { badge: "bg-neutral-500/20 text-neutral-300", badgeText: "INFO" };
                                    return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.badge}`}>{s.badgeText}</span>;
                                })()}
                                <span className="text-xs font-semibold text-white">{selectedNotif.title}</span>
                            </div>
                            <button
                                onClick={() => setSelectedNotif(null)}
                                className="text-[#A7ADBB] hover:text-white transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="flex items-center gap-2 text-[11px] text-[#A7ADBB] mb-3">
                                <span>{new Date(selectedNotif.created_at).toLocaleString()}</span>
                                {!selectedNotif.read && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                )}
                            </div>
                            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{selectedNotif.message}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}