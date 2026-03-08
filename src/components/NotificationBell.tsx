import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { useFlux } from "@/context/FluxContext";
import { format, differenceInDays, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

// ── Notification types ──────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: "task_overdue" | "savings_milestone" | "focus_streak" | "goal_reached" | "general";
  title: string;
  body: string;
  icon: string;
  timestamp: number;
  read: boolean;
}

// ── Storage helpers ─────────────────────────────────────────────────────────
const NOTIF_KEY = "dashiii-notifications-v2";

export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveNotifications(notifs: AppNotification[]) {
  // Keep last 50
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, 50)));
}

export function pushNotification(notif: Omit<AppNotification, "id" | "timestamp" | "read">) {
  const notifs = loadNotifications();
  const newNotif: AppNotification = {
    ...notif,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    read: false,
  };
  const updated = [newNotif, ...notifs];
  saveNotifications(updated);
  window.dispatchEvent(new Event("flux-notifications-updated"));
  return newNotif;
}

// ── Relative time label ─────────────────────────────────────────────────────
function relativeTime(ts: number): string {
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  return format(new Date(ts), "MMM d");
}

// ── TYPE colours ────────────────────────────────────────────────────────────
const TYPE_STYLE: Record<AppNotification["type"], string> = {
  task_overdue:     "border-l-rose-400/60",
  savings_milestone:"border-l-amber-400/60",
  focus_streak:     "border-l-orange-400/60",
  goal_reached:     "border-l-emerald-400/60",
  general:          "border-l-violet-400/60",
};

// ── Dropdown ────────────────────────────────────────────────────────────────
function NotificationDropdown({
  notifs,
  anchorRef,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onDelete,
}: {
  notifs: AppNotification[];
  anchorRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const unreadCount = notifs.filter(n => !n.read).length;

  return createPortal(
    <motion.div
      ref={dropRef}
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed z-[9990] w-80 rounded-2xl bg-[hsl(var(--card))] border border-border/40 shadow-2xl overflow-hidden"
      style={{
        top:   (anchorRef.current?.getBoundingClientRect().bottom ?? 60) + 8,
        right: window.innerWidth - (anchorRef.current?.getBoundingClientRect().right ?? 200),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Mark all as read"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <CheckCheck size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        <AnimatePresence initial={false}>
          {notifs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-10 text-center"
            >
              <p className="text-2xl mb-2">🔔</p>
              <p className="text-sm text-muted-foreground">You're all caught up!</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Milestones & reminders appear here
              </p>
            </motion.div>
          ) : (
            notifs.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, delay: i * 0.02 }}
                className={`flex items-start gap-3 px-4 py-3 border-b border-border/10 border-l-2 ${TYPE_STYLE[n.type]} ${
                  n.read ? "opacity-60" : "bg-primary/[0.02]"
                } hover:bg-muted/30 transition-colors cursor-pointer group`}
                onClick={() => onMarkRead(n.id)}
              >
                <span className="text-lg leading-none mt-0.5 shrink-0">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-medium leading-tight mb-0.5 ${n.read ? "text-foreground/70" : "text-foreground"}`}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{n.body}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">{relativeTime(n.timestamp)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/80 mt-0.5" />
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(n.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <X size={10} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {notifs.length > 0 && (
        <div className="px-4 py-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground/50 text-center">
            {notifs.length} notification{notifs.length !== 1 ? "s" : ""} · {unreadCount} unread
          </p>
        </div>
      )}
    </motion.div>,
    document.body
  );
}

// ── Main Bell Component ─────────────────────────────────────────────────────
const NotificationBell = () => {
  const { tasks } = useFlux();
  const [open, setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>(() => loadNotifications());
  const bellRef = useRef<HTMLButtonElement>(null);

  // Sync from localStorage whenever event fires
  const refresh = useCallback(() => {
    setNotifs(loadNotifications());
  }, []);

  useEffect(() => {
    window.addEventListener("flux-notifications-updated", refresh);
    return () => window.removeEventListener("flux-notifications-updated", refresh);
  }, [refresh]);

  // Watch for overdue tasks and push new notifications
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const overdueKey = "flux-notif-overdue-sent";
    const sentIds: Set<string> = new Set(
      JSON.parse(localStorage.getItem(overdueKey) ?? "[]")
    );

    const newOverdue = tasks.filter(
      t => !t.done && t.due_date && t.due_date < today && !sentIds.has(t.id)
    );

    if (newOverdue.length > 0) {
      newOverdue.forEach(t => {
        const days = differenceInDays(new Date(), parseISO(t.due_date!));
        pushNotification({
          type: "task_overdue",
          title: "Overdue Task",
          body: `"${t.title}" is ${days} day${days !== 1 ? "s" : ""} overdue`,
          icon: "⚠️",
        });
        sentIds.add(t.id);
      });
      localStorage.setItem(overdueKey, JSON.stringify([...sentIds]));
    }
  }, [tasks]);

  const unreadCount = notifs.filter(n => !n.read).length;

  const markRead = useCallback((id: string) => {
    setNotifs(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifs(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  const deleteNotif = useCallback((id: string) => {
    setNotifs(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-lg hover:bg-foreground/[0.04] transition-colors duration-150 text-muted-foreground hover:text-foreground"
        title="Notifications"
      >
        <Bell size={15} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold px-0.5"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <NotificationDropdown
            notifs={notifs}
            anchorRef={bellRef}
            onClose={() => setOpen(false)}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
            onDelete={deleteNotif}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationBell;
