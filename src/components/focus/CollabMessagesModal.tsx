import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Send, UserPlus, Users, Plus, Check, AlertCircle, LogOut,
  Trash2, Smile, Link, Copy, Moon, Sun, ChevronLeft, Search,
  Video, Phone, Info, Hash, MoreHorizontal, Clock, Paperclip,
  FileText, Image as ImageIcon, Reply, CornerUpLeft
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeamChat, getUserColor } from "@/hooks/useTeamChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const REACTION_EMOJIS = ["👍","❤️","🔥","😂","🎉","🚀","💯","😮","🙏","👏"];
const INSERT_EMOJIS = ["😀","😂","❤️","👍","🔥","🎉","✅","🚀","💡","😅","🙏","👏","💪","🤔","😎","🥳","😍","🤩","💯","⭐"];

interface CollabMessagesModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function formatConversationTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM");
}

function UserAvatar({
  userId, displayName, avatarUrl, size = "sm", pending = false
}: {
  userId: string; displayName?: string; avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl"; pending?: boolean;
}) {
  const colorClass = getUserColor(userId);
  const initial = (displayName || userId)[0]?.toUpperCase() || "?";
  const sizeMap = {
    xs: "w-5 h-5 text-[8px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-14 h-14 text-lg",
  };
  const cls = sizeMap[size];
  return (
    <div className="relative shrink-0">
      {avatarUrl && !pending ? (
        <img src={avatarUrl} alt={displayName || userId}
          className={`${cls} rounded-full object-cover`} />
      ) : (
        <div className={`${cls} ${pending ? "bg-muted" : colorClass} rounded-full flex items-center justify-center font-semibold text-white`}>
          {pending ? <Clock size={14} className="text-muted-foreground" /> : initial}
        </div>
      )}
    </div>
  );
}

function TypingBubble({ dark }: { dark: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 rounded-[18px] rounded-bl-[4px] w-fit"
      style={{ background: dark ? "#3a3a3c" : "#e9e9eb" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full animate-bounce"
          style={{ background: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)", animationDelay: `${i * 150}ms`, animationDuration: "900ms" }} />
      ))}
    </div>
  );
}

function FilePreview({ url, type, name, dark }: { url: string; type: string; name: string; dark: boolean }) {
  const isImage = type?.startsWith("image/");
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1">
        <img src={url} alt={name} className="max-w-[240px] max-h-[180px] rounded-lg object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg transition-all hover:opacity-80"
      style={{ background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
      <FileText size={16} style={{ color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }} />
      <span className="text-[13px] truncate max-w-[180px]" style={{ color: dark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.7)" }}>
        {name}
      </span>
    </a>
  );
}


const CollabMessagesModal = ({ open, onOpenChange }: CollabMessagesModalProps) => {
  const {
    messages, members, sendMessage, hasTeams, loading, teams, activeTeamId,
    setActiveTeamId, createTeam, inviteMember, markAsRead, setModalOpen, leaveTeam, deleteTeam,
    typingUsers, unreadPerTeam, handleTypingChange, reactionsMap, toggleReaction, generateInviteLink,
    pendingInvites, readReceipts, uploadFile,
  } = useTeamChat();
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [dark, setDark] = useState(true);
  const [sidebarView, setSidebarView] = useState<"conversations" | "new-team">("conversations");
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const [leavingTeamId, setLeavingTeamId] = useState<string | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [showInvitePopover, setShowInvitePopover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; userName: string } | null>(null);
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number; msgId: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme tokens — deep glassmorphism
  const T = {
    sidebar: dark ? "rgba(28,28,30,0.60)" : "rgba(242,242,247,0.50)",
    sidebarActive: dark ? "rgba(10,132,255,0.22)" : "rgba(0,122,255,0.14)",
    header: dark ? "rgba(28,28,30,0.70)" : "rgba(246,246,248,0.65)",
    divider: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
    fieldBg: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.60)",
    fieldBorder: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    chatBg: "transparent",
    myBubble: dark ? "#0a84ff" : "#007aff",
    theirBubble: dark ? "#3a3a3c" : "#e9e9eb",
    textPrimary: dark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.88)",
    textSecondary: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.50)",
    textTertiary: dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)",
    sectionLabel: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)",
    accent: dark ? "#0a84ff" : "#007aff",
    searchBg: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    inputBar: dark ? "rgba(28,28,30,0.60)" : "rgba(246,246,248,0.60)",
    reactionBg: dark ? "rgba(44,44,46,0.90)" : "rgba(255,255,255,0.90)",
    reactionBorder: dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
    green: dark ? "#32d74b" : "#34c759",
    red: dark ? "#ff453a" : "#ff3b30",
    pendingBadge: dark ? "rgba(255,214,10,0.20)" : "rgba(255,204,0,0.18)",
    pendingText: dark ? "#ffd60a" : "#c79900",
  };

  useEffect(() => {
    const userIds = [...new Set([...(user ? [user.id] : []), ...members.map(m => m.user_id)])];
    if (userIds.length === 0) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id, avatar_url").in("id", userIds);
      if (data) {
        const map: Record<string, string> = {};
        for (const p of data) { if ((p as any).avatar_url) map[p.id] = (p as any).avatar_url; }
        setAvatarMap(map);
      }
    })();
  }, [members, user]);

  useEffect(() => {
    setModalOpen(open);
    if (open) {
      markAsRead();
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 80);
    }
  }, [open]);

  // Close context menu on any click outside — use mousedown to avoid racing with button onClick
  const contextMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!contextMenuMsgId) return;
    const handler = (e: MouseEvent) => {
      // Don't close if clicking inside the context menu itself
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) return;
      setContextMenuMsgId(null);
      setContextMenuPos(null);
    };
    // Use mousedown with a small delay so it doesn't fire on the same right-click that opened it
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 50);
    return () => { clearTimeout(timeout); document.removeEventListener("mousedown", handler); };
  }, [contextMenuMsgId]);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, typingUsers.length, open]);

  const handleSend = async () => {
    if (!text.trim() && !pendingFile) return;
    const replyContent = replyTo ? `↩ ${replyTo.userName}: ${replyTo.content.slice(0, 60)}${replyTo.content.length > 60 ? "…" : ""}\n${text}` : text;
    await sendMessage(replyContent, pendingFile || undefined);
    setText("");
    setPendingFile(null);
    setReplyTo(null);
  };

  const getMemberName = (userId: string) => {
    if (userId === user?.id) return user?.user_metadata?.display_name || user?.email?.split("@")[0] || "You";
    const member = members.find(m => m.user_id === userId);
    return (member as any)?.display_name || userId.slice(0, 6);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus("sending");
    setInviteError("");
    const result = await inviteMember(inviteEmail.trim());
    if (result?.error) {
      setInviteStatus("error");
      setInviteError(result.error as string);
    } else {
      setInviteStatus("ok");
      setInviteEmail("");
      setShowInvitePopover(false);
      setTimeout(() => setInviteStatus("idle"), 2500);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const result = await createTeam(newTeamName.trim());
    setNewTeamName("");
    setSidebarView("conversations");
    if (result) toast.success(`"${result.name}" created!`);
    else toast.error("Failed to create team.");
  };

  const handleLeaveTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    setLeavingTeamId(teamId);
    const result = await leaveTeam(teamId);
    setLeavingTeamId(null);
    if (result?.error) toast.error("Could not leave: " + result.error);
    else toast.success(`Left "${team.name}"`);
  };

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !window.confirm(`Delete "${team.name}"?`)) return;
    setDeletingTeamId(teamId);
    const result = await deleteTeam(teamId);
    setDeletingTeamId(null);
    if (result?.error) toast.error("Could not delete: " + result.error);
    else toast.success(`Deleted "${team.name}"`);
  };

  const handleCopyInviteLink = async () => {
    if (!activeTeamId) return;
    setInviteLinkLoading(true);
    const token = await generateInviteLink(activeTeamId);
    setInviteLinkLoading(false);
    if (!token) { toast.error("Failed to generate link"); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/?invite=${token}`);
    toast.success("Invite link copied! Expires in 7 days.");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);
    if (result) {
      setPendingFile(result);
    } else {
      toast.error("Upload failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, msgId: string) => {
    e.preventDefault();
    setContextMenuMsgId(msgId);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuMsgId(null);
    setContextMenuPos(null);
  }, []);

  // Swipe-to-reply handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, msgId: string) => {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, msgId };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    const dy = Math.abs(e.touches[0].clientY - swipeStartRef.current.y);
    if (dy > 30) { swipeStartRef.current = null; setSwipeOffset(0); setSwipingMsgId(null); return; }
    // Only allow right swipe (positive dx)
    const offset = Math.max(0, Math.min(dx, 80));
    if (offset > 10) {
      setSwipingMsgId(swipeStartRef.current.msgId);
      setSwipeOffset(offset);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset > 50 && swipingMsgId) {
      // Trigger reply
      const msg = messages.find(m => m.id === swipingMsgId);
      if (msg) {
        setReplyTo({ id: msg.id, content: msg.content, userName: getMemberName(msg.user_id) });
      }
    }
    setSwipeOffset(0);
    setSwipingMsgId(null);
    swipeStartRef.current = null;
  }, [swipeOffset, swipingMsgId, messages]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large (max 20MB)"); return; }
    setUploading(true);
    const result = await uploadFile(file);
    setUploading(false);
    if (result) {
      setPendingFile(result);
    } else {
      toast.error("Upload failed");
    }
  }, [uploadFile]);

  const isAdmin = members.some(m => m.user_id === user?.id && m.role === "admin");
  const insertEmoji = (emoji: string) => { setText(p => p + emoji); setShowEmojiPicker(false); };
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const typingNames = typingUsers.filter(uid => uid !== user?.id).map(uid => getMemberName(uid));

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedTeams = teams.slice(0, 4);
  const showReactionFor = (msgId: string) => contextMenuMsgId === msgId;

  // Read receipts: find which members have read which messages
  const getReadByForMessage = (msgId: string) => {
    return readReceipts
      .filter(r => r.last_read_message_id === msgId && r.user_id !== user?.id)
      .map(r => r.user_id);
  };

  // Find the last own message id
  const lastOwnMsgId = [...messages].reverse().find(m => m.user_id === user?.id)?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Lighten default overlay so frosted glass effect is visible */}
      <style dangerouslySetInnerHTML={{ __html: `[data-state="open"][class*="bg-black"] { background: rgba(0,0,0,0.35) !important; backdrop-filter: blur(4px); }` }} />
      <DialogContent
        className="border-0 p-0 gap-0 overflow-hidden [&>button]:hidden"
        onOpenAutoFocus={e => e.preventDefault()}
        onPointerDownOutside={e => {
          // Prevent dialog from closing when clicking the context menu portal
          if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        style={{
          fontFamily: "-apple-system, 'SF Pro Text', 'SF Pro Display', BlinkMacSystemFont, sans-serif",
          maxWidth: "820px",
          width: "100%",
          height: "600px",
          borderRadius: "14px",
          background: dark
            ? "rgba(28,28,30,0.88)"
            : "rgba(246,246,248,0.82)",
          backdropFilter: dark
            ? "blur(60px) saturate(200%)"
            : "blur(40px) saturate(180%)",
          WebkitBackdropFilter: dark
            ? "blur(60px) saturate(200%)"
            : "blur(40px) saturate(180%)",
          border: dark
            ? "1px solid rgba(255,255,255,0.10)"
            : "1px solid rgba(255,255,255,0.60)",
          boxShadow: dark
            ? "0 40px 100px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 40px 100px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.95)",
        }}>
        <DialogTitle className="sr-only">Messages</DialogTitle>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileSelect}
        />

        {/* macOS-style close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 left-3 z-50 group w-[13px] h-[13px] rounded-full flex items-center justify-center transition-all"
          style={{
            background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
            border: `0.5px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#ff5f57"; e.currentTarget.style.borderColor = "#e0443e"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"; e.currentTarget.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; }}
        >
          <X size={8} strokeWidth={2.5} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(80,0,0,0.8)" }} />
        </button>

        <div className="flex h-full overflow-hidden" style={{ borderRadius: "14px" }}>
          {/* ── LEFT SIDEBAR ── */}
          <div
            className="flex flex-col shrink-0 overflow-hidden"
            style={{
              width: "270px",
              background: T.sidebar,
              borderRight: `1px solid ${T.divider}`,
              backdropFilter: "blur(20px)",
            }}>
            {/* Sidebar top bar */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2" style={{ borderBottom: `1px solid ${T.divider}` }}>
              <button onClick={() => setDark(d => !d)} style={{ color: T.textTertiary }}
                className="p-1.5 rounded-full transition-all hover:opacity-70">
                {dark ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <span style={{ color: T.textPrimary, fontSize: "15px", fontWeight: 600 }}>Messages</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowInvitePopover(v => !v)} style={{ color: T.accent }}
                  className="p-1.5 rounded-full transition-all hover:opacity-70" title="Invite">
                  <UserPlus size={15} />
                </button>
                <button onClick={() => setSidebarView("new-team")} style={{ color: T.accent }}
                  className="p-1.5 rounded-full transition-all hover:opacity-70" title="New Team">
                  <Plus size={15} />
                </button>
              </div>
            </div>

            {/* Invite popover */}
            <AnimatePresence>
              {showInvitePopover && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="mx-2 mb-0 mt-2 rounded-xl overflow-hidden"
                  style={{ background: T.fieldBg, border: `1px solid ${T.fieldBorder}` }}>
                  <div className="px-3 pt-3 pb-2">
                    <p style={{ color: T.textPrimary, fontSize: "12px", fontWeight: 600, marginBottom: 8 }}>Invite Partner / Company</p>
                    <div className="flex gap-1.5">
                      <input value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteStatus("idle"); }}
                        onKeyDown={e => e.key === "Enter" && handleInvite()} placeholder="Email address" type="email"
                        className="flex-1 outline-none text-[13px] bg-transparent" style={{ color: T.textPrimary }} autoFocus />
                      <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteStatus === "sending"}
                        className="px-2.5 py-1 rounded-lg text-[12px] font-semibold disabled:opacity-40"
                        style={{ background: T.accent, color: "#fff" }}>
                        {inviteStatus === "ok" ? <Check size={12} /> : inviteStatus === "sending" ? "…" : "Send"}
                      </button>
                    </div>
                    {inviteStatus === "ok" && <p style={{ color: T.green, fontSize: "11px", marginTop: 4 }}>✓ Invite sent!</p>}
                    {inviteStatus === "error" && <p style={{ color: T.red, fontSize: "11px", marginTop: 4 }}>⚠ {inviteError || "User not found"}</p>}
                  </div>
                  {activeTeamId && (
                    <button onClick={handleCopyInviteLink} disabled={inviteLinkLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-all"
                      style={{ color: T.accent, borderTop: `1px solid ${T.divider}` }}>
                      {inviteLinkLoading
                        ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        : <><Link size={11} /> Copy invite link <Copy size={10} className="opacity-50 ml-auto" /></>}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* New Team form */}
            <AnimatePresence>
              {sidebarView === "new-team" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mx-2 mt-2 rounded-xl"
                  style={{ background: T.fieldBg, border: `1px solid ${T.fieldBorder}` }}>
                  <div className="px-3 py-2.5 flex gap-1.5">
                    <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleCreateTeam(); if (e.key === "Escape") setSidebarView("conversations"); }}
                      placeholder="New team name…" className="flex-1 bg-transparent outline-none text-[13px]"
                      style={{ color: T.textPrimary }} autoFocus />
                    <button onClick={handleCreateTeam} className="px-2.5 py-1 rounded-lg text-[12px] font-semibold"
                      style={{ background: T.accent, color: "#fff" }}>Create</button>
                    <button onClick={() => setSidebarView("conversations")} style={{ color: T.textTertiary }}><X size={13} /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search */}
            <div className="px-3 pt-2 pb-1.5">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[9px]" style={{ background: T.searchBg }}>
                <Search size={12} style={{ color: T.sectionLabel }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search" className="flex-1 bg-transparent outline-none text-[13px]"
                  style={{ color: T.textPrimary }} />
              </div>
            </div>

            {/* Pinned avatars */}
            {pinnedTeams.length > 0 && !searchQuery && (
              <div className="px-3 pb-2">
                <div className="flex gap-3">
                  {pinnedTeams.map(t => (
                    <button key={t.id} onClick={() => { setActiveTeamId(t.id); setShowInfo(false); }}
                      className="flex flex-col items-center gap-1 transition-all hover:opacity-80">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white ${getUserColor(t.id)}`}
                        style={{ boxShadow: t.id === activeTeamId ? `0 0 0 3px ${T.accent}` : "none" }}>
                        {t.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-[10px] truncate max-w-[48px]" style={{ color: T.textSecondary }}>{t.name}</span>
                      {(unreadPerTeam?.[t.id] || 0) > 0 && (
                        <span className="w-2 h-2 rounded-full" style={{ background: T.accent }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Invites */}
            {pendingInvites.length > 0 && !searchQuery && (
              <div className="px-3 pb-1">
                <p style={{ color: T.sectionLabel, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Pending Invites
                </p>
                {pendingInvites.map(inv => (
                  <div key={inv.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5"
                    style={{ background: T.pendingBadge }}>
                    <UserAvatar userId={inv.created_by} displayName="Invited" pending size="sm" />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: T.textPrimary, fontSize: "13px", fontWeight: 500 }} className="truncate">
                        Invite #{inv.token.slice(0, 6)}…
                      </p>
                      <p style={{ color: T.textTertiary, fontSize: "11px" }}>{formatConversationTime(inv.created_at)}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: T.pendingBadge, color: T.pendingText, border: `1px solid ${T.pendingText}40` }}>
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Section label */}
            <div className="px-4 pb-1">
              <p style={{ color: T.sectionLabel, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Conversations
              </p>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {loading && <p style={{ color: T.textTertiary, fontSize: "13px", textAlign: "center", padding: "32px 0" }}>Loading…</p>}
              {!loading && filteredTeams.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
                  <Users size={28} style={{ color: T.textTertiary }} />
                  <p style={{ color: T.textSecondary, fontSize: "13px" }}>{searchQuery ? "No results" : "No teams yet"}</p>
                  {!searchQuery && (
                    <button onClick={() => setSidebarView("new-team")}
                      className="mt-1 px-4 py-1.5 rounded-full text-[13px] font-semibold"
                      style={{ background: T.accent, color: "#fff" }}>+ New Team</button>
                  )}
                </div>
              )}
              {filteredTeams.map(t => {
                const unread = unreadPerTeam?.[t.id] || 0;
                const isActive = t.id === activeTeamId;
                const lastMsg = messages.length > 0 && t.id === activeTeamId ? messages[messages.length - 1] : null;
                return (
                  <button key={t.id} onClick={() => { setActiveTeamId(t.id); setShowInfo(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all"
                    style={{ background: isActive ? T.sidebarActive : "transparent" }}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${getUserColor(t.id)}`}>
                      {t.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p style={{ color: T.textPrimary, fontSize: "14px", fontWeight: unread > 0 ? 700 : 500 }} className="truncate">{t.name}</p>
                        {lastMsg && <span style={{ color: T.textTertiary, fontSize: "11px" }}>{formatConversationTime(lastMsg.created_at)}</span>}
                      </div>
                      <p style={{ color: T.textSecondary, fontSize: "12px" }} className="truncate">
                        {lastMsg ? (lastMsg.file_name ? `📎 ${lastMsg.file_name}` : lastMsg.content) : `${members.length} member${members.length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
                        style={{ background: T.accent }}>{unread > 99 ? "99+" : unread}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT MAIN AREA ── */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: T.chatBg }}>
            {!activeTeam ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: dark ? "rgba(44,44,46,1)" : "rgba(229,229,234,1)" }}>
                  <Users size={28} style={{ color: T.textTertiary }} />
                </div>
                <div>
                  <p style={{ color: T.textPrimary, fontSize: "18px", fontWeight: 600 }}>No Conversation Selected</p>
                  <p style={{ color: T.textSecondary, fontSize: "14px", marginTop: 4 }}>Choose a team or create one to start collaborating.</p>
                </div>
                <button onClick={() => setSidebarView("new-team")} className="px-6 py-2.5 rounded-full text-[14px] font-semibold"
                  style={{ background: T.accent, color: "#fff" }}>New Team</button>
              </div>
            ) : showInfo ? (
              <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
                <div className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: `1px solid ${T.divider}`, background: T.header, backdropFilter: "blur(20px)" }}>
                  <button onClick={() => setShowInfo(false)} style={{ color: T.accent }} className="flex items-center gap-0.5 text-[14px]">
                    <ChevronLeft size={18} />
                  </button>
                  <p style={{ color: T.textPrimary, fontSize: "16px", fontWeight: 600 }}>Details</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "none" }}>
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white ${getUserColor(activeTeam.id)}`}>
                      {activeTeam.name[0]?.toUpperCase()}
                    </div>
                    <p style={{ color: T.textPrimary, fontSize: "18px", fontWeight: 600 }}>{activeTeam.name}</p>
                    <p style={{ color: T.textSecondary, fontSize: "13px" }}>{members.length} member{members.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.divider}` }}>
                    <p style={{ color: T.sectionLabel, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px 6px" }}>Add People</p>
                    <div className="px-3 pb-3 flex gap-2">
                      <input value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteStatus("idle"); }}
                        onKeyDown={e => e.key === "Enter" && handleInvite()} placeholder="Email address" type="email"
                        className="flex-1 rounded-[10px] px-3 py-2 text-[13px] border outline-none"
                        style={{ background: T.fieldBg, borderColor: T.fieldBorder, color: T.textPrimary }} />
                      <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteStatus === "sending"}
                        className="px-3 py-2 rounded-[10px] text-[13px] font-semibold disabled:opacity-40"
                        style={{ background: T.accent, color: "#fff" }}>
                        {inviteStatus === "ok" ? <Check size={13} /> : inviteStatus === "sending" ? "…" : "Add"}
                      </button>
                    </div>
                    <button onClick={handleCopyInviteLink} disabled={inviteLinkLoading}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all"
                      style={{ color: T.accent, borderTop: `1px solid ${T.divider}` }}>
                      {inviteLinkLoading ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <><Link size={12} /> Copy Invite Link <Copy size={11} className="opacity-50 ml-auto" /></>}
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.divider}` }}>
                    <p style={{ color: T.sectionLabel, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px 6px" }}>Members</p>
                    {members.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 group"
                        style={{ borderTop: i > 0 ? `1px solid ${T.divider}` : "none" }}>
                        <UserAvatar userId={m.user_id} displayName={(m as any).display_name} avatarUrl={avatarMap[m.user_id]} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p style={{ color: T.textPrimary, fontSize: "14px", fontWeight: 500 }} className="truncate">
                            {(m as any).display_name || m.user_id.slice(0, 8)}
                            {m.user_id === user?.id && <span style={{ color: T.textTertiary, fontSize: "11px" }}> (you)</span>}
                          </p>
                          <p style={{ color: T.textTertiary, fontSize: "11px", textTransform: "capitalize" }}>{m.role}</p>
                        </div>
                        {m.user_id === user?.id && (
                          <button onClick={() => handleLeaveTeam(activeTeamId!)} disabled={leavingTeamId === activeTeamId}
                            className="opacity-0 group-hover:opacity-100 text-[11px] px-2.5 py-1 rounded-full transition-all"
                            style={{ background: `${T.red}20`, color: T.red }}>
                            {leavingTeamId === activeTeamId ? "…" : "Leave"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isAdmin && activeTeamId && (
                    <button onClick={() => handleDeleteTeam(activeTeamId)} disabled={deletingTeamId === activeTeamId}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium disabled:opacity-30 transition-all"
                      style={{ background: `${T.red}15`, color: T.red }}>
                      {deletingTeamId === activeTeamId ? "Deleting…" : <><Trash2 size={14} /> Delete Team</>}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                {/* Chat header — centered */}
                <div className="flex items-center justify-center px-4 py-2.5 shrink-0 relative"
                  style={{ borderBottom: `1px solid ${T.divider}`, background: T.header, backdropFilter: "blur(20px)" }}>
                  <div className="flex flex-col items-center cursor-pointer" onClick={() => setShowInfo(true)}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${getUserColor(activeTeam.id)}`}>
                      {activeTeam.name[0]?.toUpperCase()}
                    </div>
                    <p style={{ color: T.textPrimary, fontSize: "13px", fontWeight: 600, lineHeight: 1.2, marginTop: 2 }}>{activeTeam.name}</p>
                    <p style={{ color: T.textSecondary, fontSize: "10px" }}>
                      {typingNames.length > 0 ? `${typingNames[0]} is typing…` : `${members.length} member${members.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <button onClick={() => setShowInfo(true)} style={{ color: T.accent }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all hover:opacity-70">
                    <Info size={17} />
                  </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1 relative" style={{ scrollbarWidth: "none" }}
                  onClick={closeContextMenu}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}>
                  {/* Drag overlay */}
                  <AnimatePresence>
                    {isDragging && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center rounded-lg"
                        style={{
                          background: dark ? "rgba(10,132,255,0.15)" : "rgba(0,122,255,0.10)",
                          border: `2px dashed ${T.accent}`,
                        }}>
                        <div className="flex flex-col items-center gap-2">
                          <Paperclip size={28} style={{ color: T.accent }} />
                          <p style={{ color: T.accent, fontSize: "15px", fontWeight: 600 }}>Drop file to attach</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {loading && <p style={{ color: T.textTertiary, fontSize: "13px", textAlign: "center", paddingTop: 40 }}>Loading…</p>}
                  {!loading && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white ${getUserColor(activeTeam.id)}`}>
                        {activeTeam.name[0]?.toUpperCase()}
                      </div>
                      <p style={{ color: T.textPrimary, fontSize: "16px", fontWeight: 600 }}>{activeTeam.name}</p>
                      <p style={{ color: T.textTertiary, fontSize: "13px" }}>No messages yet. Say hi 👋</p>
                    </div>
                  )}

                  {messages.map((msg, idx) => {
                    const isMe = msg.user_id === user?.id;
                    const name = getMemberName(msg.user_id);
                    const avatar = avatarMap[msg.user_id];
                    const msgReactions = reactionsMap[msg.id] || {};
                    const hasReactions = Object.keys(msgReactions).length > 0;
                    const prevMsg = messages[idx - 1];
                    const nextMsg = messages[idx + 1];
                    const isFirst = !prevMsg || prevMsg.user_id !== msg.user_id;
                    const isLast = !nextMsg || nextMsg.user_id !== msg.user_id;
                    const showTime = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;
                    const myRadius = `18px ${isFirst ? "4px" : "18px"} ${isLast ? "18px" : "4px"} 18px`;
                    const theirRadius = `${isFirst ? "4px" : "18px"} 18px 18px ${isLast ? "18px" : "4px"}`;

                    // Read receipts for this message
                    const readByUsers = isMe && msg.id === lastOwnMsgId ? getReadByForMessage(msg.id) : [];
                    const isLastOwnMsg = isMe && msg.id === lastOwnMsgId;

                    return (
                      <React.Fragment key={msg.id}>
                        {showTime && (
                          <div className="flex justify-center py-3">
                            <span style={{ color: T.sectionLabel, fontSize: "11px", fontWeight: 500 }}>
                              {format(new Date(msg.created_at), "EEE, MMM d · HH:mm")}
                            </span>
                          </div>
                        )}
                        <div
                          className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"} ${isLast ? "mb-1" : "mb-[2px]"}`}
                          onTouchStart={(e) => handleTouchStart(e, msg.id)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          style={{ transform: swipingMsgId === msg.id ? `translateX(${swipeOffset}px)` : undefined, transition: swipingMsgId === msg.id ? "none" : "transform 0.2s ease" }}>
                          {/* Swipe reply icon */}
                          {swipingMsgId === msg.id && swipeOffset > 20 && (
                            <div className="absolute left-0 flex items-center" style={{ opacity: Math.min(1, swipeOffset / 60) }}>
                              <CornerUpLeft size={16} style={{ color: T.accent }} />
                            </div>
                          )}
                          <div className="w-8 shrink-0 flex justify-center">
                            {!isMe && isLast && <UserAvatar userId={msg.user_id} displayName={name} avatarUrl={avatar} size="sm" />}
                          </div>
                          <div className={`flex flex-col max-w-[68%] ${isMe ? "items-end" : "items-start"}`}>
                            {!isMe && isFirst && (
                              <span style={{ color: T.sectionLabel, fontSize: "11px", fontWeight: 500, padding: "0 4px 2px" }}>{name}</span>
                            )}
                            <div className="relative">
                              <div
                                onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                style={{
                                  background: isMe ? T.myBubble : T.theirBubble,
                                  color: isMe ? "#fff" : T.textPrimary,
                                  borderRadius: isMe ? myRadius : theirRadius,
                                  padding: "8px 14px",
                                  fontSize: "15px",
                                  lineHeight: 1.4,
                                  cursor: "default",
                                  userSelect: "text",
                                }}>
                                {/* Quoted reply rendering */}
                                {msg.content.startsWith("↩ ") && msg.content.includes("\n") && (() => {
                                  const nlIdx = msg.content.indexOf("\n");
                                  const quoteLine = msg.content.slice(2, nlIdx);
                                  const actualText = msg.content.slice(nlIdx + 1);
                                  return (
                                    <>
                                      <div className="mb-1.5 px-2 py-1 rounded-lg text-[12px] leading-snug border-l-2"
                                        style={{
                                          background: isMe ? "rgba(255,255,255,0.15)" : (dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                                          borderColor: T.accent,
                                          color: isMe ? "rgba(255,255,255,0.7)" : T.textSecondary,
                                        }}>
                                        {quoteLine}
                                      </div>
                                      <span>{actualText}</span>
                                    </>
                                  );
                                })()}
                                {!(msg.content.startsWith("↩ ") && msg.content.includes("\n")) && msg.content}
                                {msg.file_url && msg.file_type && msg.file_name && (
                                  <FilePreview url={msg.file_url} type={msg.file_type} name={msg.file_name} dark={dark} />
                                )}
                              </div>

                              {/* Right-click context menu — rendered inside dialog to avoid focus trap blocking */}
                            </div>

                            {/* iMessage-style Tapback reactions — badge on bubble corner */}
                            {hasReactions && (
                              <div className={`flex items-center gap-0.5 -mt-2 mb-1 ${isMe ? "justify-end pr-2" : "justify-start pl-2"}`}>
                                <div className="flex items-center rounded-full px-1.5 py-0.5 shadow-sm border"
                                  style={{
                                    background: dark ? "rgba(44,44,46,0.95)" : "rgba(255,255,255,0.95)",
                                    borderColor: T.reactionBorder,
                                    backdropFilter: "blur(10px)",
                                  }}>
                                  {Object.entries(msgReactions).map(([emoji, userIds]) => (
                                    <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                      className="text-[13px] leading-none hover:scale-110 transition-transform">
                                      {emoji}
                                    </button>
                                  ))}
                                  {Object.values(msgReactions).reduce((sum, ids) => sum + (ids as string[]).length, 0) > 1 && (
                                    <span className="text-[10px] font-medium ml-0.5" style={{ color: T.textSecondary }}>
                                      {Object.values(msgReactions).reduce((sum, ids) => sum + (ids as string[]).length, 0)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Read receipts / Delivered */}
                            {isLastOwnMsg && (
                              <div className="flex items-center gap-1 mt-0.5 pr-1" style={{ justifyContent: "flex-end" }}>
                                {readByUsers.length > 0 ? (
                                  <>
                                    <span style={{ color: T.textTertiary, fontSize: "10px" }}>Read</span>
                                    <div className="flex -space-x-1.5">
                                      {readByUsers.slice(0, 3).map(uid => (
                                        <UserAvatar key={uid} userId={uid} displayName={getMemberName(uid)} avatarUrl={avatarMap[uid]} size="xs" />
                                      ))}
                                    </div>
                                  </>
                                ) : (
                                  <span style={{ color: T.textTertiary, fontSize: "10px" }}>Delivered</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  <AnimatePresence>
                    {typingNames.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                        className="flex items-end gap-2 py-1">
                        <div className="w-8 flex justify-center">
                          {typingUsers.filter(uid => uid !== user?.id).slice(0, 1).map(uid => (
                            <UserAvatar key={uid} userId={uid} displayName={getMemberName(uid)} avatarUrl={avatarMap[uid]} size="sm" />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <TypingBubble dark={dark} />
                          <span style={{ color: T.textTertiary, fontSize: "11px", fontStyle: "italic" }}>
                            {typingNames.length === 1
                              ? `${typingNames[0]} is typing…`
                              : typingNames.length === 2
                                ? `${typingNames[0]} and ${typingNames[1]} are typing…`
                                : `${typingNames[0]} and ${typingNames.length - 1} others are typing…`}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input bar */}
                <div className="px-3 py-2.5 shrink-0" style={{ borderTop: `1px solid ${T.divider}`, background: T.inputBar, backdropFilter: "blur(20px)" }}>
                  {/* Reply preview */}
                  {replyTo && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border-l-2"
                      style={{
                        background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                        borderColor: T.accent,
                      }}>
                      <Reply size={14} style={{ color: T.accent }} />
                      <div className="flex-1 min-w-0">
                        <p style={{ color: T.accent, fontSize: "11px", fontWeight: 600 }}>{replyTo.userName}</p>
                        <p style={{ color: T.textSecondary, fontSize: "12px" }} className="truncate">{replyTo.content}</p>
                      </div>
                      <button onClick={() => setReplyTo(null)} style={{ color: T.textTertiary }}><X size={14} /></button>
                    </div>
                  )}

                  {/* Pending file preview */}
                  {pendingFile && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
                      {pendingFile.type.startsWith("image/") ? (
                        <img src={pendingFile.url} alt="" className="w-10 h-10 rounded-md object-cover" />
                      ) : (
                        <FileText size={16} style={{ color: T.textSecondary }} />
                      )}
                      <span className="text-[12px] flex-1 truncate" style={{ color: T.textPrimary }}>{pendingFile.name}</span>
                      <button onClick={() => setPendingFile(null)} style={{ color: T.textTertiary }}><X size={14} /></button>
                    </div>
                  )}

                  {showEmojiPicker && (
                    <div className="mb-2 p-2 rounded-xl grid grid-cols-10 gap-1"
                      style={{ background: dark ? "rgba(28,28,30,0.95)" : "rgba(229,229,234,0.95)" }}>
                      {INSERT_EMOJIS.map(e => (
                        <button key={e} onClick={() => insertEmoji(e)}
                          className="text-[18px] hover:scale-125 transition-transform leading-none">{e}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 rounded-full transition-all shrink-0"
                      style={{ color: uploading ? T.accent : T.textTertiary }}>
                      {uploading ? (
                        <span className="w-[18px] h-[18px] rounded-full border-2 border-current border-t-transparent animate-spin block" />
                      ) : (
                        <Plus size={18} />
                      )}
                    </button>
                    <div className="flex-1 flex items-center gap-2 rounded-full px-3 py-2 border transition-all"
                      style={{ background: T.fieldBg, borderColor: T.fieldBorder }}>
                      <input
                        value={text}
                        onChange={e => { setText(e.target.value); handleTypingChange(); }}
                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Message"
                        className="flex-1 bg-transparent outline-none text-[15px]"
                        style={{ color: T.textPrimary }}
                      />
                      <button onClick={() => setShowEmojiPicker(v => !v)}
                        className="p-0.5 rounded-full transition-all shrink-0"
                        style={{ color: showEmojiPicker ? T.accent : T.textTertiary }}>
                        <Smile size={16} />
                      </button>
                    </div>
                    <button onClick={handleSend} disabled={!text.trim() && !pendingFile}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0"
                      style={{
                        background: (text.trim() || pendingFile) ? T.accent : (dark ? "rgba(44,44,46,1)" : "rgba(229,229,234,1)"),
                        color: (text.trim() || pendingFile) ? "#fff" : T.textTertiary,
                      }}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Context menu via portal to body so it renders above everything */}
        {contextMenuMsgId && contextMenuPos && (() => {
          const msg = messages.find(m => m.id === contextMenuMsgId);
          if (!msg) return null;
          const msgReactions = reactionsMap[msg.id] || {};
          const menuWidth = 260;
          const menuHeight = 172;
          const top = Math.max(8, Math.min(contextMenuPos.y - 100, window.innerHeight - menuHeight - 8));
          const left = Math.max(8, Math.min(contextMenuPos.x - 120, window.innerWidth - menuWidth - 8));

          return createPortal(
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
              className="fixed flex flex-col gap-1 rounded-2xl overflow-hidden"
              style={{
                zIndex: 99999,
                top,
                left,
                transformOrigin: "center top",
                background: T.reactionBg,
                border: `1px solid ${T.reactionBorder}`,
                boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                backdropFilter: "blur(30px)",
                width: `${menuWidth}px`,
                pointerEvents: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}>
              {/* Emoji row — iMessage Tapback style */}
              <div className="flex items-center justify-between px-3 py-2.5">
                {REACTION_EMOJIS.slice(0, 6).map(emoji => {
                  const alreadyReacted = (msgReactions[emoji] as string[] | undefined)?.includes(user?.id || "");
                  return (
                    <button key={emoji} onClick={() => { toggleReaction(msg.id, emoji); closeContextMenu(); }}
                      className="text-[22px] hover:scale-125 transition-transform leading-none p-1.5 rounded-full"
                      style={{
                        background: alreadyReacted ? (dark ? "rgba(10,132,255,0.25)" : "rgba(0,122,255,0.15)") : "transparent",
                        outline: alreadyReacted ? `2px solid ${T.accent}` : "none",
                      }}
                      onMouseEnter={(ev) => { if (!alreadyReacted) ev.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"; }}
                      onMouseLeave={(ev) => { if (!alreadyReacted) ev.currentTarget.style.background = "transparent"; }}>
                      {emoji}
                    </button>
                  );
                })}
              </div>
              <div style={{ height: 1, background: T.divider }} />
              <button
                onClick={() => {
                  setReplyTo({ id: msg.id, content: msg.content, userName: getMemberName(msg.user_id) });
                  closeContextMenu();
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-[14px] transition-all text-left"
                style={{ color: T.textPrimary }}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
                <Reply size={16} style={{ color: T.textSecondary }} />
                Reply
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(msg.content); closeContextMenu(); toast.success("Copied"); }}
                className="flex items-center gap-3 px-4 py-2.5 text-[14px] transition-all text-left"
                style={{ color: T.textPrimary }}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
                <Copy size={16} style={{ color: T.textSecondary }} />
                Copy
              </button>
            </motion.div>,
            document.body
          );
        })()}
      </DialogContent>
    </Dialog>
  );
};

export default CollabMessagesModal;
