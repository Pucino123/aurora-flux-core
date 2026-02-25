import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Send, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { isDanish } from "@/lib/i18n";

interface Highlight {
  text: string;
  color: string;
}

interface DocumentAiChatProps {
  getDocumentContent: () => string;
  editorRef?: React.RefObject<HTMLDivElement>;
  lightMode?: boolean;
}

type Msg = { role: "user" | "assistant"; content: string; highlights?: Highlight[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flux-ai`;

// Parse highlights from AI response: [[highlight:text here]] patterns
function extractHighlights(content: string): { cleanContent: string; highlights: Highlight[] } {
  const highlights: Highlight[] = [];
  const cleanContent = content.replace(/\[\[highlight:(.*?)\]\]/g, (_, text) => {
    highlights.push({ text: text.trim(), color: "hsl(48 96% 53% / 0.35)" });
    return `**"${text.trim()}"**`;
  });
  return { cleanContent, highlights };
}

const DocumentAiChat = ({ getDocumentContent, editorRef, lightMode = false }: DocumentAiChatProps) => {
  const lm = lightMode;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeHighlights, setActiveHighlights] = useState<Highlight[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Apply highlights to the editor
  const applyHighlights = useCallback((highlights: Highlight[]) => {
    if (!editorRef?.current) return;
    // Clear previous highlights
    clearHighlights();
    
    const editor = editorRef.current;
    highlights.forEach(({ text, color }) => {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const idx = node.textContent?.indexOf(text) ?? -1;
        if (idx === -1) continue;
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + text.length);
        const mark = document.createElement("mark");
        mark.className = "ai-highlight";
        mark.style.backgroundColor = color;
        mark.style.borderRadius = "2px";
        mark.style.padding = "1px 0";
        mark.style.transition = "background-color 0.3s";
        mark.style.cursor = "pointer";
        range.surroundContents(mark);
        break; // Only first occurrence
      }
    });
    setActiveHighlights(highlights);
  }, [editorRef]);

  const clearHighlights = useCallback(() => {
    if (!editorRef?.current) return;
    editorRef.current.querySelectorAll("mark.ai-highlight").forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
        parent.normalize();
      }
    });
    setActiveHighlights([]);
  }, [editorRef]);

  // Clear highlights when chat closes
  useEffect(() => {
    if (!open) clearHighlights();
  }, [open, clearHighlights]);

  const scrollToHighlight = useCallback((text: string) => {
    if (!editorRef?.current) return;
    const marks = editorRef.current.querySelectorAll("mark.ai-highlight");
    for (const mark of marks) {
      if (mark.textContent?.includes(text)) {
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
        (mark as HTMLElement).style.backgroundColor = "hsl(48 96% 53% / 0.6)";
        setTimeout(() => {
          (mark as HTMLElement).style.backgroundColor = "hsl(48 96% 53% / 0.35)";
        }, 1500);
        break;
      }
    }
  }, [editorRef]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    clearHighlights();
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
        const { cleanContent, highlights } = extractHighlights(assistantSoFar);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > 0 && prev[prev.length - 2]?.role === "user") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanContent, highlights } : m);
          }
          return [...prev, { role: "assistant", content: cleanContent, highlights }];
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

      // Apply highlights after streaming is done
      const { highlights } = extractHighlights(assistantSoFar);
      if (highlights.length > 0) applyHighlights(highlights);

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
        <Sparkles size={13} className="text-primary" />
        <span>{isDanish ? "Dokument AI" : "Document AI"}</span>
        <span className={`text-[10px] ml-1 ${lm ? "text-gray-400" : "text-foreground/30"}`}>
          {isDanish ? "sparring partner" : "sparring partner"}
        </span>
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
                    <div className="prose prose-sm max-w-none [&_p]:mb-1 [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-primary/80">
                      <ReactMarkdown
                        components={{
                          strong: ({ children }) => {
                            const text = String(children);
                            // Check if this is a highlighted quote (starts and ends with ")
                            const isHighlightRef = text.startsWith('"') && text.endsWith('"');
                            if (isHighlightRef) {
                              return (
                                <strong
                                  className="cursor-pointer hover:underline text-primary/90"
                                  onClick={() => scrollToHighlight(text.slice(1, -1))}
                                  title={isDanish ? "Klik for at finde i dokument" : "Click to find in document"}
                                >
                                  {children}
                                </strong>
                              );
                            }
                            return <strong>{children}</strong>;
                          }
                        }}
                      >{m.content}</ReactMarkdown>
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
          {activeHighlights.length > 0 && (
            <button
              onClick={clearHighlights}
              className={`text-[10px] mb-2 px-2 py-1 rounded transition-colors ${
                lm ? "text-gray-500 hover:bg-gray-100" : "text-foreground/40 hover:bg-white/5"
              }`}
            >
              {isDanish ? "Fjern markeringer" : "Clear highlights"} ({activeHighlights.length})
            </button>
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
