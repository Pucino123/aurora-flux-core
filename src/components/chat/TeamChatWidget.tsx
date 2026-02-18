import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Plus, Users, Circle } from "lucide-react";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

const TeamChatWidget = () => {
  const { user } = useAuth();
  const {
    teams, activeTeamId, setActiveTeamId,
    messages, members, onlineUsers,
    loading, sendMessage, createTeam, hasTeams,
  } = useTeamChat();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (loading) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    await createTeam(newTeamName.trim());
    setNewTeamName("");
    setShowCreate(false);
  };

  const getMemberName = (userId: string) => {
    if (userId === user?.id) return "You";
    const member = members.find((m) => m.user_id === userId);
    return member?.display_name || userId.slice(0, 8);
  };

  const isOnline = (userId: string) => onlineUsers.includes(userId);

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
          >
            <MessageSquare size={20} />
            {hasTeams && messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[340px] h-[460px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary" />
                {teams.length > 1 ? (
                  <select
                    value={activeTeamId || ""}
                    onChange={(e) => setActiveTeamId(e.target.value)}
                    className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm font-semibold">
                    {teams[0]?.name || "Team Chat"}
                  </span>
                )}
                {onlineUsers.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {onlineUsers.length} online
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowCreate(true)}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Create team dialog */}
            {showCreate && (
              <div className="px-4 py-3 border-b border-border/30 bg-secondary/20">
                <p className="text-xs font-medium mb-2">Create a new team</p>
                <div className="flex gap-2">
                  <input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Team name..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border/50 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  />
                  <button
                    onClick={handleCreateTeam}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* Messages or empty state */}
            {!hasTeams && !showCreate ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
                <Users size={32} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No teams yet</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium"
                >
                  Create Team
                </button>
              </div>
            ) : (
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.user_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Circle
                          size={6}
                          className={isOnline(msg.user_id) ? "text-green-400 fill-green-400" : "text-muted-foreground/30 fill-muted-foreground/30"}
                        />
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {getMemberName(msg.user_id)}
                        </span>
                        <span className="text-[9px] text-muted-foreground/50">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                      </div>
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          isOwn
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary/60 text-foreground rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Input */}
            {hasTeams && (
              <div className="px-3 py-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30 text-xs outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TeamChatWidget;
