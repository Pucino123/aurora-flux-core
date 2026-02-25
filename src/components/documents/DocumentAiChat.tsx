import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { isDanish } from "@/lib/i18n";

interface DocumentAiChatProps {
  getDocumentContent: () => string;
  lightMode?: boolean;
}

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flux-ai`;

const DocumentAiChat = ({ getDocumentContent, lightMode = false }: DocumentAiChatProps) => {
  const lm = lightMode;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const documentContent = getDocumentContent();
    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "document-chat",
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: { documentContent },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${err.error || "Fejl"}` }]);
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > 0 && prev[prev.length - 2]?.role === "user") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Document AI chat error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Could not reach AI." }]);
    }
    setLoading(false);
  };

  return (
    <div className={`border-t ${lm ? "border-gray-200 bg-gray-50/80" : "border-border/20 bg-secondary/10"}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
          lm ? "text-gray-600 hover:bg-gray-100" : "text-foreground/60 hover:bg-white/5"
        }`}
      >
        <MessageSquare size={13} className="text-primary" />
        <span>{isDanish ? "Dokument AI" : "Document AI"}</span>
        {open ? <ChevronDown size={13} className="ml-auto" /> : <ChevronUp size={13} className="ml-auto" />}
      </button>

      {open && (
        <div className="px-3 pb-3">
          {messages.length > 0 && (
            <div ref={scrollRef} className="max-h-[200px] overflow-y-auto space-y-2 mb-2">
              {messages.map((m, i) => (
                <div key={i} className={`text-xs rounded-lg px-3 py-2 ${
                  m.role === "user"
                    ? lm ? "bg-primary/10 text-gray-800 ml-8" : "bg-primary/15 text-foreground/90 ml-8"
                    : lm ? "bg-white border border-gray-200 text-gray-700 mr-4" : "bg-card/60 border border-border/20 text-foreground/80 mr-4"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&_p]:mb-1 [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3">
                  <Loader2 size={12} className="animate-spin" />
                  {isDanish ? "Tænker..." : "Thinking..."}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={isDanish ? "Spørg AI om dit dokument..." : "Ask AI about your document..."}
              className={`flex-1 text-xs px-3 py-2 rounded-lg outline-none transition-colors ${
                lm
                  ? "bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-primary/40"
                  : "bg-card/40 border border-border/20 text-foreground/90 placeholder:text-foreground/30 focus:border-primary/40"
              }`}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className={`p-2 rounded-lg transition-colors ${
                loading || !input.trim()
                  ? "opacity-40 cursor-not-allowed"
                  : lm ? "bg-primary text-white hover:bg-primary/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentAiChat;
