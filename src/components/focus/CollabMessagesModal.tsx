import React, { useState, useRef, useEffect } from "react";
import { X, Send, UserPlus, Users, Plus, Check, AlertCircle, LogOut, Trash2, Smile, Hash, Link, Copy, Moon, Sun, ChevronLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeamChat, getUserColor } from "@/hooks/useTeamChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const REACTION_EMOJIS = ["👍","❤️","🔥","😂","🎉","🚀","💯","😮","😢","👏"];
const INSERT_EMOJIS = ["😀","😂","❤️","👍","🔥","🎉","✅","🚀","💡","😅","🙏","👏","💪","🤔","😎","🥳","😍","🤩","💯","⭐"];

interface CollabMessagesModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Tab = "chat" | "contacts";

function UserAvatar({ userId, displayName, avatarUrl, size = "sm" }: {
  userId: string; displayName?: string; avatarUrl?: string; size?: "sm" | "md" | "lg";
}) {
  const colorClass = getUserColor(userId);
  const initial = (displayName || userId)[0]?.toUpperCase() || "?";
  const sizeClass = size === "lg" ? "w-10 h-10 text-base" : size === "md" ? "w-8 h-8 text-sm" : "w-7 h-7 text-xs";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={displayName || userId} className={`${sizeClass} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {initial}
    </div>
  );
}

function TypingBubble({ dark }: { dark: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[18px] rounded-bl-[4px] w-fit ${dark ? "bg-[#3a3a3c]" : "bg-[#e9e9eb]"}`}>
      {[0, 1, 2].map((i) => (
        <span key={i}
          className={`w-2 h-2 rounded-full animate-bounce ${dark ? "bg-white/40" : "bg-black/30"}`}
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }} />
      ))}
    </div>
  );
}

const CollabMessagesModal = ({ open, onOpenChange }: CollabMessagesModalProps) => {
  const {
    messages, members, sendMessage, hasTeams, loading, teams, activeTeamId,
    setActiveTeamId, createTeam, inviteMember, markAsRead, setModalOpen, leaveTeam, deleteTeam,
    typingUsers, unreadPerTeam, handleTypingChange, reactionsMap, toggleReaction, generateInviteLink,
  } = useTeamChat();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [tab, setTab] = useState<Tab>("chat");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [inviteError, setInviteError] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [leavingTeamId, setLeavingTeamId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const [dark, setDark] = useState(true);
  const [showTeamList, setShowTeamList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userIds = [...new Set([
      ...(user ? [user.id] : []),
      ...members.map((m) => m.user_id),
    ])];
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
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
    }
  }, [open, markAsRead, setModalOpen]);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, typingUsers.length, open]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(text);
    setText("");
  };

  const getMemberName = (userId: string) => {
    if (userId === user?.id) return user?.user_metadata?.display_name || user?.email?.split("@")[0] || "You";
    const member = members.find((m) => m.user_id === userId);
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
      setTimeout(() => setInviteStatus("idle"), 2500);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const result = await createTeam(newTeamName.trim());
    setNewTeamName("");
    setShowCreateTeam(false);
    if (result) {
      setTab("chat");
      setShowTeamList(false);
      toast.success(`Team "${result.name}" created!`);
    } else {
      toast.error("Failed to create team. Please try again.");
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    setLeavingTeamId(teamId);
    const result = await leaveTeam(teamId);
    setLeavingTeamId(null);
    if (result?.error) toast.error("Could not leave team: " + result.error);
    else { toast.success(`Left "${team.name}"`); if (teams.length <= 1) setTab("chat"); }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    if (!window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    setDeletingTeamId(teamId);
    const result = await deleteTeam(teamId);
    setDeletingTeamId(null);
    if (result?.error) toast.error("Could not delete team: " + result.error);
    else toast.success(`Deleted "${team.name}"`);
  };

  const handleCopyInviteLink = async () => {
    if (!activeTeamId) return;
    setInviteLinkLoading(true);
    const token = await generateInviteLink(activeTeamId);
    setInviteLinkLoading(false);
    if (!token) { toast.error("Failed to generate invite link"); return; }
    const url = `${window.location.origin}/?invite=${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard! Expires in 7 days.");
  };

  const isAdmin = members.some((m) => m.user_id === user?.id && m.role === "admin");
  const insertEmoji = (emoji: string) => { setText((prev) => prev + emoji); setShowEmojiPicker(false); };
  const activeTeam = teams.find((t) => t.id === activeTeamId);
  const typingNames = typingUsers.filter((uid) => uid !== user?.id).map((uid) => getMemberName(uid));

  // iMessage theme tokens
  const bg = dark ? "bg-[#000000]" : "bg-[#ffffff]";
  const headerBg = dark ? "bg-[#1c1c1e]/95" : "bg-[#f2f2f7]/95";
  const inputBg = dark ? "bg-[#1c1c1e]" : "bg-[#f2f2f7]";
  const fieldBg = dark ? "bg-[#2c2c2e] border-[#3a3a3c] text-white placeholder:text-[#636366]" : "bg-[#ffffff] border-[#d1d1d6] text-[#1c1c1e] placeholder:text-[#8e8e93]";
  const divider = dark ? "border-[#38383a]" : "border-[#c6c6c8]";
  const textPrimary = dark ? "text-white" : "text-[#1c1c1e]";
  const textSecondary = dark ? "text-[#ebebf5]/60" : "text-[#3c3c43]/60";
  const textTertiary = dark ? "text-[#ebebf5]/30" : "text-[#3c3c43]/30";
  const myBubble = "bg-[#0a84ff] text-white";
  const theirBubble = dark ? "bg-[#3a3a3c] text-white" : "bg-[#e9e9eb] text-[#1c1c1e]";
  const reactionBg = dark ? "bg-[#2c2c2e] border-[#48484a]" : "bg-white border-[#d1d1d6] shadow-sm";
  const hoverPill = dark ? "bg-[#1c1c1e] border-[#38383a]" : "bg-white border-[#d1d1d6] shadow-md";
  const memberCard = dark ? "bg-[#1c1c1e] hover:bg-[#2c2c2e]" : "bg-[#f2f2f7] hover:bg-[#e5e5ea]";
  const sectionLabel = dark ? "text-[#636366]" : "text-[#8e8e93]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${bg} border-0 max-w-[390px] w-full p-0 gap-0 rounded-[22px] overflow-hidden [&>button]:hidden shadow-2xl`}
        style={{ fontFamily: "-apple-system, 'SF Pro Text', 'SF Pro Display', BlinkMacSystemFont, sans-serif" }}>
        <DialogTitle className="sr-only">Messages</DialogTitle>

        {/* iOS-style navigation header */}
        <div className={`${headerBg} backdrop-blur-2xl border-b ${divider} px-4 pt-3 pb-2`}>
          {/* top bar */}
          <div className="flex items-center justify-between mb-2">
            {showTeamList ? (
              <button onClick={() => setShowTeamList(false)} className={`flex items-center gap-0.5 ${dark ? "text-[#0a84ff]" : "text-[#007aff]"} text-[15px] font-normal`}>
                <ChevronLeft size={20} strokeWidth={2.5} />
                <span>Back</span>
              </button>
            ) : (
              <button onClick={() => { if (teams.length > 0) setShowTeamList(true); }} className={`${dark ? "text-[#0a84ff]" : "text-[#007aff]"} text-[15px] font-normal`}>
                {teams.length > 1 ? "Teams" : ""}
              </button>
            )}

            {/* Center: avatar + team name */}
            <div className="flex flex-col items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
              {activeTeam && !showTeamList ? (
                <>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${getUserColor(activeTeam.id)}`}>
                    {activeTeam.name[0]?.toUpperCase()}
                  </div>
                  <span className={`text-[13px] font-semibold ${textPrimary} leading-none`}>{activeTeam.name}</span>
                  <span className={`text-[10px] ${textTertiary}`}>{members.length} member{members.length !== 1 ? "s" : ""}</span>
                </>
              ) : (
                <span className={`text-[17px] font-semibold ${textPrimary}`}>Messages</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setDark((d) => !d)} className={`${textTertiary} hover:${textSecondary} transition-colors`}>
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => onOpenChange(false)} className={`${textTertiary} transition-colors`}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tab pills (only when not in team list) */}
          {!showTeamList && (
            <div className={`flex items-center gap-1 p-0.5 rounded-full ${dark ? "bg-[#2c2c2e]" : "bg-[#e5e5ea]"}`}>
              {(["chat", "contacts"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                    tab === t
                      ? (dark ? "bg-[#636366] text-white shadow-sm" : "bg-white text-[#1c1c1e] shadow-sm")
                      : textSecondary
                  }`}>
                  {t === "chat" ? "Messages" : "Info"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team list screen */}
        <AnimatePresence mode="wait">
          {showTeamList ? (
            <motion.div key="teamlist" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-[72vh] overflow-y-auto">
              <div className="px-4 py-3">
                <p className={`text-[11px] uppercase tracking-wider font-semibold ${sectionLabel} mb-2`}>Your Teams</p>
                <div className="space-y-1">
                  {teams.map((t) => {
                    const unread = unreadPerTeam?.[t.id] || 0;
                    const isActive = t.id === activeTeamId;
                    return (
                      <button key={t.id} onClick={() => { setActiveTeamId(t.id); setShowTeamList(false); setTab("chat"); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] transition-all ${isActive ? (dark ? "bg-[#0a84ff]/20" : "bg-[#007aff]/10") : memberCard}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getUserColor(t.id)}`}>
                          {t.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className={`text-[14px] font-semibold ${textPrimary} truncate`}>{t.name}</p>
                          <p className={`text-[11px] ${textTertiary}`}>#{t.name.toLowerCase()}</p>
                        </div>
                        {unread > 0 && (
                          <span className="min-w-[20px] h-5 rounded-full bg-[#0a84ff] text-white text-[11px] font-bold flex items-center justify-center px-1.5">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                        {isActive && <Check size={14} className={dark ? "text-[#0a84ff]" : "text-[#007aff]"} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* New team */}
              <div className={`mt-auto px-4 py-4 border-t ${divider}`}>
                {showCreateTeam ? (
                  <div className="flex gap-2">
                    <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateTeam(); if (e.key === "Escape") setShowCreateTeam(false); }}
                      placeholder="Team name..."
                      className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] border outline-none ${fieldBg}`}
                      autoFocus />
                    <button onClick={handleCreateTeam} className={`px-3 py-2 rounded-[10px] text-[13px] font-semibold ${dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white"}`}>Create</button>
                    <button onClick={() => setShowCreateTeam(false)} className={`p-2 ${textTertiary}`}><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowCreateTeam(true)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-[14px] font-medium transition-all ${dark ? "bg-[#1c1c1e] text-[#0a84ff]" : "bg-[#f2f2f7] text-[#007aff]"}`}>
                    <Plus size={15} /> New Team
                  </button>
                )}
              </div>
            </motion.div>
          ) : tab === "chat" ? (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
              {/* Messages */}
              <div ref={scrollRef} className="overflow-y-auto px-3 py-3 space-y-1 h-[50vh]" style={{ scrollbarWidth: "none" }}>
                {loading && <p className={`${textTertiary} text-[13px] text-center py-12`}>Loading…</p>}
                {!loading && !hasTeams && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${dark ? "bg-[#1c1c1e]" : "bg-[#f2f2f7]"}`}>
                      <Users size={28} className={textTertiary} />
                    </div>
                    <div>
                      <p className={`text-[16px] font-semibold ${textPrimary}`}>No Teams Yet</p>
                      <p className={`text-[13px] ${textSecondary} mt-1`}>Create a team to start chatting</p>
                    </div>
                    {!showCreateTeam ? (
                      <button onClick={() => setShowCreateTeam(true)}
                        className={`px-6 py-2.5 rounded-full text-[14px] font-semibold ${dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white"}`}>
                        New Team
                      </button>
                    ) : (
                      <div className="flex gap-2 w-full">
                        <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                          placeholder="Team name…"
                          className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] border outline-none ${fieldBg}`}
                          autoFocus />
                        <button onClick={handleCreateTeam} className={`px-3 py-2 rounded-[10px] text-[13px] font-semibold ${dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white"}`}>
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!loading && hasTeams && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white ${activeTeam ? getUserColor(activeTeam.id) : "bg-gray-500"}`}>
                      {activeTeam?.name[0]?.toUpperCase()}
                    </div>
                    <p className={`text-[16px] font-semibold ${textPrimary}`}>{activeTeam?.name}</p>
                    <p className={`text-[13px] ${textSecondary}`}>{members.length} member{members.length !== 1 ? "s" : ""}</p>
                    <p className={`text-[13px] ${textTertiary} mt-2`}>No messages yet. Say hi! 👋</p>
                  </div>
                )}

                {/* Group messages by sender for iMessage-style clustering */}
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
                  // Time gap
                  const showTime = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;

                  // Bubble tail shape
                  const myRadius = `rounded-[18px] ${isFirst ? "rounded-tr-[6px]" : ""} ${isLast ? "rounded-br-[18px]" : "rounded-br-[6px]"}`;
                  const theirRadius = `rounded-[18px] ${isFirst ? "rounded-tl-[6px]" : ""} ${isLast ? "rounded-bl-[18px]" : "rounded-bl-[6px]"}`;

                  return (
                    <React.Fragment key={msg.id}>
                      {showTime && (
                        <div className="flex justify-center py-3">
                          <span className={`text-[11px] font-medium ${sectionLabel}`}>
                            {format(new Date(msg.created_at), "EEE HH:mm")}
                          </span>
                        </div>
                      )}
                      <div className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"} ${isLast ? "mb-1" : "mb-0.5"}`}
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}>
                        {/* Avatar — only show for last message in group */}
                        <div className="w-7 shrink-0">
                          {!isMe && isLast && (
                            <UserAvatar userId={msg.user_id} displayName={name} avatarUrl={avatar} size="sm" />
                          )}
                        </div>

                        <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                          {/* Sender name for first message of group (not me) */}
                          {!isMe && isFirst && (
                            <span className={`text-[11px] font-medium ${sectionLabel} px-2 mb-0.5`}>{name}</span>
                          )}

                          <div className="relative">
                            <div className={`px-3.5 py-2 text-[15px] leading-[1.4] ${isMe ? `${myBubble} ${myRadius}` : `${theirBubble} ${theirRadius}`}`}>
                              {msg.content}
                            </div>

                            {/* Reaction picker on hover */}
                            <AnimatePresence>
                              {hoveredMsgId === msg.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8, y: 4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.8, y: 4 }}
                                  className={`absolute ${isMe ? "right-0 mr-0" : "left-0"} -top-10 flex items-center gap-1 ${hoverPill} border rounded-full px-2 py-1.5 z-20`}>
                                  {REACTION_EMOJIS.map((e) => (
                                    <button key={e} onClick={() => toggleReaction(msg.id, e)}
                                      className="text-[15px] hover:scale-125 transition-transform leading-none">
                                      {e}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Reactions */}
                          {hasReactions && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                              {Object.entries(msgReactions).map(([emoji, userIds]) => {
                                const myReaction = userIds.includes(user?.id || "");
                                return (
                                  <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                    className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[12px] font-medium border transition-all ${
                                      myReaction
                                        ? (dark ? "bg-[#0a84ff]/25 border-[#0a84ff]/50 text-white" : "bg-[#007aff]/15 border-[#007aff]/40 text-[#007aff]")
                                        : (dark ? "bg-[#2c2c2e] border-[#48484a] text-white/70" : "bg-white border-[#d1d1d6] text-[#3c3c43] shadow-sm")
                                    }`}>
                                    <span>{emoji}</span>
                                    <span className="text-[11px]">{userIds.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Typing indicator */}
                <AnimatePresence>
                  {typingNames.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                      className="flex items-end gap-1.5">
                      <div className="w-7">
                        {typingUsers.filter(uid => uid !== user?.id).slice(0, 1).map((uid) => (
                          <UserAvatar key={uid} userId={uid} displayName={getMemberName(uid)} avatarUrl={avatarMap[uid]} size="sm" />
                        ))}
                      </div>
                      <TypingBubble dark={dark} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input bar */}
              {hasTeams && (
                <div className={`px-3 py-2.5 border-t ${divider} ${inputBg}`}>
                  {showEmojiPicker && (
                    <div className={`mb-2 p-2 rounded-[14px] grid grid-cols-10 gap-1 ${dark ? "bg-[#1c1c1e]" : "bg-[#e5e5ea]"}`}>
                      {INSERT_EMOJIS.map((e) => (
                        <button key={e} onClick={() => insertEmoji(e)} className="text-[18px] hover:scale-125 transition-transform leading-none">{e}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {user && <UserAvatar userId={user.id} displayName={getMemberName(user.id)} avatarUrl={avatarMap[user.id]} size="sm" />}
                    <button onClick={() => setShowEmojiPicker((v) => !v)}
                      className={`p-1.5 rounded-full transition-all shrink-0 ${showEmojiPicker ? (dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white") : textTertiary}`}>
                      <Smile size={18} />
                    </button>
                    <div className={`flex-1 flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all ${fieldBg}`}>
                      <input
                        value={text}
                        onChange={(e) => { setText(e.target.value); handleTypingChange(); }}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder={`iMessage`}
                        className="flex-1 bg-transparent text-[15px] outline-none"
                      />
                    </div>
                    <button onClick={handleSend} disabled={!text.trim()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                        text.trim()
                          ? (dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white")
                          : (dark ? "bg-[#2c2c2e] text-[#636366]" : "bg-[#e5e5ea] text-[#8e8e93]")
                      }`}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Info / Contacts tab */
            <motion.div key="contacts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
              {/* Team picker */}
              {teams.length > 1 && (
                <div className={`px-4 py-3 border-b ${divider} flex gap-2 overflow-x-auto`} style={{ scrollbarWidth: "none" }}>
                  {teams.map((t) => (
                    <button key={t.id} onClick={() => setActiveTeamId(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium shrink-0 transition-all ${
                        t.id === activeTeamId
                          ? (dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white")
                          : (dark ? "bg-[#2c2c2e] text-white/60" : "bg-[#e5e5ea] text-[#3c3c43]")
                      }`}>
                      <Hash size={11} />{t.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="overflow-y-auto flex-1 max-h-[56vh]" style={{ scrollbarWidth: "none" }}>
                {/* Invite section */}
                <div className={`px-4 py-4 border-b ${divider}`}>
                  <p className={`text-[11px] uppercase tracking-wider font-semibold ${sectionLabel} mb-3`}>Add People</p>
                  <div className="flex gap-2 mb-2">
                    <input value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteStatus("idle"); }}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      placeholder="Email address" type="email"
                      className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] border outline-none ${fieldBg}`} />
                    <button onClick={handleInvite} disabled={!inviteEmail.trim() || inviteStatus === "sending"}
                      className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all disabled:opacity-40 ${dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white"}`}>
                      {inviteStatus === "ok" ? <Check size={14} /> : inviteStatus === "sending" ? "…" : "Add"}
                    </button>
                  </div>
                  {inviteStatus === "ok" && <p className={`text-[12px] flex items-center gap-1 ${dark ? "text-[#32d74b]" : "text-[#34c759]"}`}><Check size={12} /> Invite sent!</p>}
                  {inviteStatus === "error" && <p className={`text-[12px] flex items-center gap-1 ${dark ? "text-[#ff453a]" : "text-[#ff3b30]"}`}><AlertCircle size={12} /> {inviteError || "User not found"}</p>}

                  {activeTeamId && (
                    <button onClick={handleCopyInviteLink} disabled={inviteLinkLoading}
                      className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-medium transition-all disabled:opacity-40 ${dark ? "bg-[#1c1c1e] text-[#0a84ff]" : "bg-[#f2f2f7] text-[#007aff]"}`}>
                      {inviteLinkLoading
                        ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        : <><Link size={13} /> Copy Invite Link <Copy size={11} className="opacity-50" /></>
                      }
                    </button>
                  )}
                </div>

                {/* Members */}
                <div className="px-4 py-4">
                  <p className={`text-[11px] uppercase tracking-wider font-semibold ${sectionLabel} mb-3`}>
                    Members — {members.length}
                  </p>
                  {members.length === 0 ? (
                    <p className={`text-[13px] ${textTertiary} text-center py-6`}>No members yet</p>
                  ) : (
                    <div className="space-y-1">
                      {members.map((m) => (
                        <div key={m.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-[14px] transition-all group ${memberCard}`}>
                          <UserAvatar userId={m.user_id} displayName={(m as any).display_name} avatarUrl={avatarMap[m.user_id]} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[14px] font-semibold ${textPrimary} truncate`}>
                              {(m as any).display_name || m.user_id.slice(0, 8)}
                              {m.user_id === user?.id && <span className={`ml-1 text-[11px] font-normal ${textTertiary}`}>(you)</span>}
                            </p>
                            <p className={`text-[11px] capitalize ${textTertiary}`}>{m.role}</p>
                          </div>
                          {m.user_id === user?.id ? (
                            <button onClick={() => handleLeaveTeam(activeTeamId!)} disabled={leavingTeamId === activeTeamId}
                              className={`opacity-0 group-hover:opacity-100 text-[12px] px-2.5 py-1 rounded-full transition-all disabled:opacity-30 ${dark ? "bg-[#ff453a]/20 text-[#ff453a]" : "bg-[#ff3b30]/10 text-[#ff3b30]"}`}>
                              {leavingTeamId === activeTeamId ? "…" : "Leave"}
                            </button>
                          ) : (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full capitalize ${dark ? "bg-[#2c2c2e] text-[#636366]" : "bg-[#e5e5ea] text-[#8e8e93]"}`}>{m.role}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className={`px-4 py-3 border-t ${divider} space-y-2 ${inputBg}`}>
                {isAdmin && activeTeamId && (
                  <button onClick={() => handleDeleteTeam(activeTeamId)} disabled={deletingTeamId === activeTeamId}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[14px] font-medium transition-all disabled:opacity-30 ${dark ? "bg-[#ff453a]/15 text-[#ff453a]" : "bg-[#ff3b30]/10 text-[#ff3b30]"}`}>
                    {deletingTeamId === activeTeamId ? "Deleting…" : <><Trash2 size={14} /> Delete Team</>}
                  </button>
                )}
                {showCreateTeam ? (
                  <div className="flex gap-2">
                    <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreateTeam(); if (e.key === "Escape") setShowCreateTeam(false); }}
                      placeholder="Team name…"
                      className={`flex-1 rounded-[10px] px-3 py-2 text-[14px] border outline-none ${fieldBg}`}
                      autoFocus />
                    <button onClick={handleCreateTeam} className={`px-3 py-2 rounded-[10px] text-[13px] font-semibold ${dark ? "bg-[#0a84ff] text-white" : "bg-[#007aff] text-white"}`}>Create</button>
                    <button onClick={() => setShowCreateTeam(false)} className={`p-2 ${textTertiary}`}><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowCreateTeam(true)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[14px] font-medium transition-all ${dark ? "bg-[#1c1c1e] text-[#0a84ff]" : "bg-[#f2f2f7] text-[#007aff]"}`}>
                    <Plus size={15} /> New Team
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CollabMessagesModal;
