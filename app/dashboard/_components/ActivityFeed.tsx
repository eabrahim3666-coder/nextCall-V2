"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import { AnimatePresence, motion } from "framer-motion";
import { getPusherClient } from "@/lib/pusher-client";
import type { Activity } from "@/lib/pusher";

const MAX_TOASTS = 3;
const STATUS_DURATION_MS: Record<Activity["status"], number> = {
  success: 4000,
  pending: 5000,
  error: 7000,
  info: 4000,
};
const IDLE_AFTER_MS = 3000; // silence -> "AI Idle"
const IDLE_HOLD_MS = 1500; // hold idle, then fade the center away

const statusPalette: Record<Activity["status"], { box: string; icon: string; dot: string }> = {
  success: { box: "bg-emerald-500/15", icon: "text-emerald-400", dot: "bg-emerald-400" },
  pending: { box: "bg-amber-500/15", icon: "text-amber-400", dot: "bg-amber-400 animate-pulse" },
  error: { box: "bg-rose-500/15", icon: "text-rose-400", dot: "bg-rose-400" },
  info: { box: "bg-indigo-500/15", icon: "text-indigo-400", dot: "bg-indigo-400" },
};

interface ToastItem extends Activity {
  id: number;
}

interface TimerEntry {
  timer: ReturnType<typeof setTimeout> | null;
  deadline: number;
  remaining: number;
}

type Header = { kind: "working"; label: string } | { kind: "idle" } | null;

export default function ActivityFeed({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [header, setHeader] = useState<Header>(null);
  const dismissTimers = useRef<Map<number, TimerEntry>>(new Map());
  const cycleTimers = useRef<{ end: ReturnType<typeof setTimeout> | null; hide: ReturnType<typeof setTimeout> | null }>({
    end: null,
    hide: null,
  });

  const clearCycle = useCallback(() => {
    if (cycleTimers.current.end) clearTimeout(cycleTimers.current.end);
    if (cycleTimers.current.hide) clearTimeout(cycleTimers.current.hide);
    cycleTimers.current = { end: null, hide: null };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const entry = dismissTimers.current.get(id);
    if (entry?.timer) clearTimeout(entry.timer);
    dismissTimers.current.delete(id);
  }, []);

  const scheduleDismiss = useCallback(
    (id: number, duration: number) => {
      const timer = setTimeout(() => dismiss(id), duration);
      dismissTimers.current.set(id, { timer, deadline: Date.now() + duration, remaining: duration });
    },
    [dismiss]
  );

  const pauseDismiss = useCallback((id: number) => {
    const entry = dismissTimers.current.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = null;
    entry.remaining = Math.max(0, entry.deadline - Date.now());
  }, []);

  const resumeDismiss = useCallback(
    (id: number) => {
      const entry = dismissTimers.current.get(id);
      if (!entry || entry.timer || entry.remaining <= 0) return;
      scheduleDismiss(id, entry.remaining);
    },
    [scheduleDismiss]
  );

  const scheduleCycle = useCallback(() => {
    clearCycle();
    cycleTimers.current.end = setTimeout(() => {
      setHeader((h) => (h ? { kind: "idle" } : h));
      cycleTimers.current.hide = setTimeout(() => {
        setHeader(null);
        setToasts([]);
      }, IDLE_HOLD_MS);
    }, IDLE_AFTER_MS);
  }, [clearCycle]);

  const wake = useCallback(
    (agentState?: string) => {
      clearCycle();
      setHeader((h) => {
        if (h?.kind === "working" && !agentState) return h;
        return { kind: "working", label: agentState || (h?.kind === "working" ? h.label : "Working") };
      });
      scheduleCycle();
    },
    [clearCycle, scheduleCycle]
  );

  const handleActivity = useCallback(
    (activity: Activity) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { ...activity, id }]);
      scheduleDismiss(id, STATUS_DURATION_MS[activity.status] ?? 4000);
      wake(activity.agent_state);
    },
    [scheduleDismiss, wake]
  );

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-business-${businessId}`);
    const handler = (data: Activity) => handleActivity(data);
    channel.bind("activity:new", handler);

    return () => {
      channel.unbind("activity:new", handler);
      pusher.unsubscribe(`private-business-${businessId}`);
      clearCycle();
      dismissTimers.current.forEach((entry) => {
        if (entry.timer) clearTimeout(entry.timer);
      });
      dismissTimers.current.clear();
    };
  }, [businessId, handleActivity, clearCycle]);

  const visible = header !== null || toasts.length > 0;

  const handleRowClick = (toast: ToastItem) => {
    if (toast.href) router.push(toast.href);
    dismiss(toast.id);
  };

  return (
    <div className="fixed top-20 right-4 md:right-6 z-[9999] pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="activity-center"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto w-[360px] max-w-[calc(100vw-2rem)] rounded-xl bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/[0.06] shadow-2xl shadow-black/50 overflow-hidden"
          >
            {header && (
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.05]">
                {header.kind === "working" ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <motion.p
                      key={header.label}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-[13px] leading-tight"
                    >
                      <span className="text-neutral-400">AI </span>
                      <span className="text-white font-semibold">{header.label}</span>
                    </motion.p>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:moon" width={13} className="text-neutral-600" />
                    <p className="text-[13px] text-neutral-500 font-medium leading-tight">AI Idle</p>
                  </>
                )}
              </div>
            )}

            {toasts.length > 0 && (
              <ul className="py-1">
                <AnimatePresence initial={false}>
                  {toasts.map((toast) => {
                    const palette = statusPalette[toast.status] || statusPalette.info;
                    return (
                      <motion.li
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="group cursor-pointer select-none"
                      >
                        <div
                          className="flex items-start gap-3 px-4 py-2.5"
                          onMouseEnter={() => pauseDismiss(toast.id)}
                          onMouseLeave={() => resumeDismiss(toast.id)}
                          onClick={() => handleRowClick(toast)}
                        >
                          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${palette.box}`}>
                            <Icon icon={toast.icon} width={16} className={palette.icon} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-white leading-snug">{toast.title}</p>
                            {toast.message && (
                              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2 leading-relaxed">{toast.message}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex items-start gap-2 pt-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full mt-0.5 ${palette.dot}`} />
                            {toast.href && (
                              <Icon icon="lucide:chevron-right" width={13} className="text-neutral-600 mt-0.5" />
                            )}
                            <button
                              aria-label="Dismiss"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismiss(toast.id);
                              }}
                              className="rounded-md p-0.5 -m-0.5 text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.06] transition-colors"
                            >
                              <Icon icon="lucide:x" width={12} />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
