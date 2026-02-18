import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
  isMe: boolean;
}

const USERS = [
  { name: "You", avatar: "Y", online: true },
  { name: "Alex", avatar: "A", online: true },
  { name: "Sarah", avatar: "S", online: false },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "1", user: "Alex", avatar: "A", text: "Hey! Did you see the new design mockups?", time: "10:23 AM", isMe: false },
  { id: "2", user: "You", avatar: "Y", text: "Yes, they look great! I especially like the new dashboard layout.", time: "10:25 AM", isMe: true },
  { id: "3", user: "Sarah", avatar: "S", text: "I'll have feedback ready by EOD 👍", time: "10:30 AM", isMe: false },
  { id: "4", user: "Alex", avatar: "A", text: "Perfect. Let's sync up at 3pm to review everything together.", time: "10:32 AM", isMe: false },
  { id: "5", user: "You", avatar: "Y", text: "Sounds good, I'll prepare the presentation slides.", time: "10:35 AM", isMe: true },
];

const TeamChatView = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      user: "You",
      avatar: "Y",
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate typing response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-reply`,
          user: "Alex",
          avatar: "A",
          text: "Got it, thanks! 🙌",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMe: false,
        },
      ]);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
      {/* Online users bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <span className="text-xs text-muted-foreground font-medium">Team</span>
        <div className="flex items-center gap-2">
          {USERS.map((u) => (
            <div key={u.name} className="flex items-center gap-1.5">
              <div className="relative">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {u.avatar}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                    u.online ? "bg-green-500" : "bg-muted-foreground/40"
                  }`}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">{u.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i < INITIAL_MESSAGES.length ? i * 0.03 : 0 }}
            className={`flex items-end gap-2 ${msg.isMe ? "flex-row-reverse" : ""}`}
          >
            {!msg.isMe && (
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                {msg.avatar}
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                msg.isMe
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "glass-panel rounded-bl-md"
              }`}
            >
              {!msg.isMe && <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{msg.user}</p>}
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-[9px] mt-1 ${msg.isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {msg.time}
              </p>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">
              A
            </div>
            <div className="glass-panel rounded-2xl rounded-bl-md px-4 py-2.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 glass-panel rounded-2xl px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-all hover:bg-primary/90"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamChatView;
