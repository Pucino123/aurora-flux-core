import React, { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useTeamChat } from "@/hooks/useTeamChat";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface CollabMessagesModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CollabMessagesModal = ({ open, onOpenChange }: CollabMessagesModalProps) => {
  const { messages, members, sendMessage, hasTeams, loading } = useTeamChat();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, messages.length]);

  const handleSend = async () => { if (!text.trim()) return; await sendMessage(text); setText(""); };
  const getMemberName = (userId: string) => { const member = members.find((m) => m.user_id === userId); return (member as any)?.display_name || userId.slice(0, 6); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/80 backdrop-blur-[24px] border-white/15 text-white max-w-md p-0 gap-0 rounded-2xl overflow-hidden">
        <DialogTitle className="sr-only">Team Messages</DialogTitle>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white/80">Team Messages</span>
          <button onClick={() => onOpenChange(false)} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[50vh] min-h-[200px] council-hidden-scrollbar">
          {loading && <p className="text-white/30 text-xs text-center py-8">Loading...</p>}
          {!loading && !hasTeams && <p className="text-white/30 text-xs text-center py-8">No teams yet. Create one from the Chat widget.</p>}
          {!loading && hasTeams && messages.length === 0 && <p className="text-white/30 text-xs text-center py-8">No messages yet.</p>}
          {messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <span className="text-[9px] text-white/25 mb-0.5 px-1">{isMe ? "You" : getMemberName(msg.user_id)} · {format(new Date(msg.created_at), "HH:mm")}</span>
                <div className={`px-3 py-2 rounded-xl text-xs max-w-[85%] ${isMe ? "bg-white/15 text-white/90" : "bg-white/5 text-white/70"}`}>{msg.content}</div>
              </div>
            );
          })}
        </div>
        {hasTeams && (
          <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 placeholder:text-white/25 outline-none focus:border-white/20 transition-colors" />
            <button onClick={handleSend} disabled={!text.trim()} className="p-2 rounded-xl bg-white/10 text-white/50 hover:text-white hover:bg-white/15 transition-all disabled:opacity-30"><Send size={14} /></button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CollabMessagesModal;
