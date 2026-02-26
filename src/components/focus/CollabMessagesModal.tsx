import React, { useState, useRef, useEffect } from "react";
import { X, Send, UserPlus, Users, Plus, Check, AlertCircle, LogOut, Trash2, Smile, Hash } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeamChat, getUserColor } from "@/hooks/useTeamChat";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const EMOJIS = ["😀","😂","❤️","👍","🔥","🎉","✅","🚀","💡","😅","🙏","👏","💪","🤔","😎","🥳","😍","🤩","💯","⭐"];

interface CollabMessagesModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Tab = "chat" | "contacts";

// Avatar component with consistent color per user
function UserAvatar({ userId, displayName, size = "sm" }: { userId: string; displayName?: string; size?: "sm" | "md" }) {
  const colorClass = getUserColor(userId);
  const initial = (displayName || userId)[0]?.toUpperCase() || "?";
  const sizeClass = size === "md" ? "w-8 h-8 text-sm" : "w-6 h-6 text-[10px]";
  return (
    <div className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {initial}
    </div>
  );
}

// Typing indicator dots
function TypingDots() {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }}
        />
      ))}
    </div>
  );
}

const CollabMessagesModal = ({ open, onOpenChange }: CollabMessagesModalProps) => {
  const {
    messages, members, sendMessage, hasTeams, loading, teams, activeTeamId,
    setActiveTeamId, createTeam, inviteMember, markAsRead, setModalOpen, leaveTeam, deleteTeam,
    typingUsers, unreadPerTeam, handleTypingChange,
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setModalOpen(open);
    if (open) {
      markAsRead();
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    }
  }, [open, markAsRead, setModalOpen]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, typingUsers.length, open]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(text);
    setText("");
  };

  const getMemberName = (userId: string) => {
    if (userId === user?.id) return "You";
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
    if (result?.error) {
      toast.error("Could not leave team: " + result.error);
    } else {
      toast.success(`Left "${team.name}"`);
      if (teams.length <= 1) setTab("chat");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    if (!window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    setDeletingTeamId(teamId);
    const result = await deleteTeam(teamId);
    setDeletingTeamId(null);
    if (result?.error) {
      toast.error("Could not delete team: " + result.error);
    } else {
      toast.success(`Deleted "${team.name}"`);
    }
  };

  const isAdmin = members.some((m) => m.user_id === user?.id && m.role === "admin");
  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const activeTeam = teams.find((t) => t.id === activeTeamId);

  // Names of people typing (excluding self)
  const typingNames = typingUsers
    .filter((uid) => uid !== user?.id)
    .map((uid) => getMemberName(uid));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-[24px] border-white/15 text-white max-w-md p-0 gap-0 rounded-2xl overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Team Collaboration</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            {/* Tab pills */}
            <div className="flex items-center gap-0.5 bg-white/5 rounded-full p-0.5 shrink-0">
              {(["chat", "contacts"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    tab === t ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {t === "chat" ? "Messages" : "Contacts"}
                </button>
              ))}
            </div>

            {/* Team tabs — show all teams as clickable pills */}
            {teams.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {teams.map((t) => {
                  const unread = unreadPerTeam?.[t.id] || 0;
                  const isActive = t.id === activeTeamId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTeamId(t.id)}
                      className={`relative flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
                      }`}
                    >
                      <Hash size={9} className="opacity-60" />
                      <span className="max-w-[64px] truncate">{t.name}</span>
                      {unread > 0 && !isActive && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={() => onOpenChange(false)} className="text-white/30 hover:text-white/60 transition-colors ml-2 shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Active team banner */}
        {activeTeam && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border-b border-white/5">
            <div className={`w-2 h-2 rounded-full ${getUserColor(activeTeam.id)}`} />
            <span className="text-[11px] font-semibold text-white/60">#{activeTeam.name}</span>
            <span className="text-[10px] text-white/25 ml-auto">{members.length} member{members.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === "chat" ? (
            <motion.div key="chat" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col">
              {/* Messages */}
              <div ref={scrollRef} className="overflow-y-auto px-4 py-3 space-y-3 h-[44vh] council-hidden-scrollbar">
                {loading && <p className="text-white/30 text-xs text-center py-8">Loading...</p>}
                {!loading && !hasTeams && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    <Users size={36} className="text-white/20" />
                    <p className="text-white/40 text-sm">No teams yet</p>
                    <button
                      onClick={() => setShowCreateTeam(true)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/15 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
                    >
                      <Plus size={12} /> Create Team
                    </button>
                    {showCreateTeam && (
                      <div className="flex gap-2 w-full max-w-[260px]">
                        <input
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                          placeholder="Team name..."
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 placeholder:text-white/25 outline-none focus:border-white/20"
                          autoFocus
                        />
                        <button onClick={handleCreateTeam} className="px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-medium">
                          Create
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!loading && hasTeams && messages.length === 0 && (
                  <p className="text-white/30 text-xs text-center py-8">No messages yet. Say hi! 👋</p>
                )}
                {messages.map((msg) => {
                  const isMe = msg.user_id === user?.id;
                  const name = getMemberName(msg.user_id);
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <UserAvatar userId={msg.user_id} displayName={name} />
                      )}
                      <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                        <span className="text-[9px] text-white/25 mb-0.5 px-1">
                          {isMe ? "You" : name} · {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                        <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          isMe ? "bg-white/15 text-white/90 rounded-br-sm" : "bg-white/5 text-white/70 rounded-bl-sm"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                <AnimatePresence>
                  {typingNames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex -space-x-1">
                        {typingUsers.filter(uid => uid !== user?.id).slice(0, 3).map((uid) => (
                          <UserAvatar key={uid} userId={uid} displayName={getMemberName(uid)} size="sm" />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 rounded-2xl rounded-bl-sm px-3 py-2">
                        <TypingDots />
                        <span className="text-[10px] text-white/30">
                          {typingNames.length === 1
                            ? `${typingNames[0]} is typing`
                            : `${typingNames.length} people are typing`}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input */}
              {hasTeams && (
                <div className="px-4 py-3 border-t border-white/10">
                  {showEmojiPicker && (
                    <div className="mb-2 p-2 bg-white/5 border border-white/10 rounded-xl grid grid-cols-10 gap-1">
                      {EMOJIS.map((e) => (
                        <button key={e} onClick={() => insertEmoji(e)} className="text-base hover:scale-125 transition-transform leading-none">
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all shrink-0"
                    >
                      <Smile size={14} />
                    </button>
                    <input
                      value={text}
                      onChange={(e) => { setText(e.target.value); handleTypingChange(); }}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder={`Message #${activeTeam?.name || "team"}...`}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!text.trim()}
                      className="p-2 rounded-xl bg-white/10 text-white/50 hover:text-white hover:bg-white/15 transition-all disabled:opacity-30 shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="contacts" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col">
              {/* Invite section */}
              <div className="px-5 py-4 border-b border-white/10">
                <p className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-1.5">
                  <UserPlus size={12} /> Invite to #{activeTeam?.name}
                </p>
                <div className="flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteStatus("idle"); }}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    placeholder="user@email.com"
                    type="email"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviteStatus === "sending"}
                    className="px-3 py-2 rounded-xl bg-white/10 text-white/60 hover:bg-white/15 hover:text-white text-xs font-medium transition-all disabled:opacity-30 flex items-center gap-1"
                  >
                    {inviteStatus === "ok" ? <Check size={12} /> : inviteStatus === "sending" ? "..." : "Invite"}
                  </button>
                </div>
                {inviteStatus === "ok" && (
                  <p className="text-[11px] text-white/50 mt-2 flex items-center gap-1"><Check size={11} /> Invited!</p>
                )}
                {inviteStatus === "error" && (
                  <p className="text-[11px] text-white/40 mt-2 flex items-center gap-1"><AlertCircle size={11} /> {inviteError || "User not found"}</p>
                )}
              </div>

              {/* Members list */}
              <div className="px-5 py-4 overflow-y-auto council-hidden-scrollbar max-h-[34vh]">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">
                  Members ({members.length})
                </p>
                {members.length === 0 ? (
                  <p className="text-white/25 text-xs text-center py-6">No members yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors group">
                        <UserAvatar userId={m.user_id} displayName={(m as any).display_name} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/80 truncate">{(m as any).display_name || m.user_id.slice(0, 8)}</p>
                          <p className="text-[10px] text-white/30 capitalize">{m.role}</p>
                        </div>
                        {m.user_id === user?.id ? (
                          <button
                            onClick={() => handleLeaveTeam(activeTeamId!)}
                            disabled={leavingTeamId === activeTeamId}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                            title="Leave team"
                          >
                            {leavingTeamId === activeTeamId ? "..." : <><LogOut size={10} /> Leave</>}
                          </button>
                        ) : (
                          <span className="text-[9px] text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full capitalize">{m.role}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-5 py-3 border-t border-white/10 flex flex-col gap-2">
                {isAdmin && activeTeamId && (
                  <button
                    onClick={() => handleDeleteTeam(activeTeamId)}
                    disabled={deletingTeamId === activeTeamId}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 text-red-400/70 hover:bg-red-500/20 hover:text-red-400 text-xs font-medium transition-all disabled:opacity-30"
                  >
                    {deletingTeamId === activeTeamId ? "Deleting..." : <><Trash2 size={11} /> Delete Team</>}
                  </button>
                )}
                {showCreateTeam ? (
                  <div className="flex gap-2">
                    <input
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateTeam();
                        if (e.key === "Escape") setShowCreateTeam(false);
                      }}
                      placeholder="New team name..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 placeholder:text-white/25 outline-none focus:border-white/20"
                      autoFocus
                    />
                    <button onClick={handleCreateTeam} className="px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-medium">Create</button>
                    <button onClick={() => setShowCreateTeam(false)} className="p-2 text-white/30 hover:text-white/60"><X size={12} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreateTeam(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-medium transition-all"
                  >
                    <Plus size={12} /> New Team
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
