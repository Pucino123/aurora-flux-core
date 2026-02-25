import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, ChevronDown, ChevronUp, Loader2, Sparkles, Check, GripVertical, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { isDanish } from "@/lib/i18n";
import FloatingStudioItem from "./toolbar/FloatingStudioItem";

interface Highlight {
  text: string;
  color: string;
}

interface Suggestion {
  original: string;
  replacement: string;
}

interface DocumentAiChatProps {
  getDocumentContent: () => string;
  editorRef?: React.RefObject<HTMLDivElement>;
  lightMode?: boolean;
  studioMode?: boolean;
}

type Msg = { role: "user" | "assistant"; content: string; highlights?: Highlight[]; suggestions?: Suggestion[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flux-ai`;

function extractHighlights(content: string): { cleanContent: string; highlights: Highlight[] } {
  const highlights: Highlight[] = [];
  const cleanContent = content.replace(/\[\[highlight:([\s\S]*?)\]\]/g, (_, text) => {
    const trimmed = text.trim();
    if (trimmed) highlights.push({ text: trimmed, color: "hsl(48 96% 53% / 0.35)" });
    return `**"${trimmed}"**`;
  });
  return { cleanContent, highlights };
}

function extractSuggestions(content: string): { cleanContent: string; suggestions: Suggestion[] } {
  const suggestions: Suggestion[] = [];
  const cleanContent = content.replace(/\[\[suggest:([\s\S]+?)\|([\s\S]+?)\]\]/g, (_, original, replacement) => {
    suggestions.push({ original: original.trim(), replacement: replacement.trim() });
    return `\n> ~~${original.trim()}~~ → **${replacement.trim()}**\n`;
  });
  return { cleanContent, suggestions };
}

const DocumentAiChat = ({ getDocumentContent, editorRef, lightMode = false, studioMode = false }: DocumentAiChatProps) => {
  const lm = lightMode;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeHighlights, setActiveHighlights] = useState<Highlight[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const applyHighlights = useCallback((highlights: Highlight[]) => {
    if (!editorRef?.current) return;
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
        break;
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

  const applySuggestion = useCallback((suggestion: Suggestion, globalIdx: number) => {
    if (!editorRef?.current) return;
    const editor = editorRef.current;
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const idx = node.textContent?.indexOf(suggestion.original) ?? -1;
      if (idx === -1) continue;
      const before = node.textContent!.substring(0, idx);
      const after = node.textContent!.substring(idx + suggestion.original.length);
      node.textContent = before + suggestion.replacement + after;
      setAppliedSuggestions(prev => new Set(prev).add(globalIdx));
      // Trigger content save
      const event = new Event("input", { bubbles: true });
      editor.dispatchEvent(event);
      break;
    }
  }, [editorRef]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    clearHighlights();
    setAppliedSuggestions(new Set());
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
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${err.error || "Error"}` }]);
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        const h = extractHighlights(assistantSoFar);
        const s = extractSuggestions(h.cleanContent);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && prev.length > 0 && prev[prev.length - 2]?.role === "user") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: s.cleanContent, highlights: h.highlights, suggestions: s.suggestions } : m);
          }
          return [...prev, { role: "assistant", content: s.cleanContent, highlights: h.highlights, suggestions: s.suggestions }];
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

      const { highlights } = extractHighlights(assistantSoFar);
      if (highlights.length > 0) applyHighlights(highlights);

    } catch (e) {
      console.error("Document AI chat error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "❌ Could not reach AI." }]);
    }
    setLoading(false);
  };

  // Track suggestion index globally across messages
  let globalSuggestionIdx = 0;

  const chatContent = (
    <div className={`border-t ${lm ? "border-gray-200 bg-gray-50/80" : "border-border/20 bg-secondary/10"}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
          lm ? "text-gray-600 hover:bg-gray-100" : "text-foreground/60 hover:bg-white/5"
        }`}
      >
        <Sparkles size={13} className="text-primary" />
        <span>Sparring Partner</span>
        {open && messages.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setMessages([]); setAppliedSuggestions(new Set()); clearHighlights(); }}
            className={`ml-1 p-1 rounded transition-colors ${lm ? "hover:bg-gray-200 text-gray-400" : "hover:bg-white/10 text-foreground/30"}`}
            title={isDanish ? "Nulstil chat" : "Reset chat"}
          >
            <RotateCcw size={11} />
          </button>
        )}
        {open ? <ChevronDown size={13} className="ml-auto" /> : <ChevronUp size={13} className="ml-auto" />}
      </button>

      {open && (
        <div className="px-3 pb-3">
          {messages.length > 0 && (
            <div ref={scrollRef} className="max-h-[250px] overflow-y-auto space-y-2 mb-2">
              {messages.map((m, i) => {
                const msgSuggestionStartIdx = globalSuggestionIdx;
                if (m.suggestions) globalSuggestionIdx += m.suggestions.length;
                return (
                  <div key={i} className={`text-xs rounded-lg px-3 py-2 ${
                    m.role === "user"
                      ? lm ? "bg-primary/10 text-gray-800 ml-8" : "bg-primary/15 text-foreground/90 ml-8"
                      : lm ? "bg-white border border-gray-200 text-gray-700 mr-4" : "bg-card/60 border border-border/20 text-foreground/80 mr-4"
                  }`}>
                    {m.role === "assistant" ? (
                      <>
                        <div className="prose prose-sm max-w-none [&_p]:mb-1 [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-primary/80 [&_del]:text-destructive/60 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-2 [&_blockquote]:my-1">
                          <ReactMarkdown
                            components={{
                              strong: ({ children }) => {
                                const text = String(children);
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
                        {m.suggestions && m.suggestions.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {m.suggestions.map((s, si) => {
                              const gIdx = msgSuggestionStartIdx + si;
                              const applied = appliedSuggestions.has(gIdx);
                              return (
                                <div key={si} className={`text-[10px] rounded-md overflow-hidden transition-all ${
                                  applied
                                    ? lm ? "border border-green-200" : "border border-green-500/20"
                                    : lm ? "border border-primary/20" : "border border-primary/20"
                                }`}>
                                  <div className={`px-2 py-1 ${lm ? "bg-red-50/50" : "bg-destructive/5"}`}>
                                    <span className={`line-through ${lm ? "text-gray-400" : "text-foreground/30"}`}>{s.original}</span>
                                  </div>
                                  <div className={`px-2 py-1 ${lm ? "bg-green-50/50" : "bg-green-500/5"}`}>
                                    <span className={`${lm ? "text-gray-700" : "text-foreground/80"}`}>{s.replacement}</span>
                                  </div>
                                  <button
                                    disabled={applied}
                                    onClick={() => applySuggestion(s, gIdx)}
                                    className={`flex items-center gap-1.5 w-full px-2 py-1 transition-all ${
                                      applied
                                        ? lm ? "bg-green-50 text-green-700" : "bg-green-500/10 text-green-400"
                                        : lm ? "bg-primary/5 text-primary hover:bg-primary/10" : "bg-primary/10 text-primary hover:bg-primary/20"
                                    }`}
                                  >
                                    {applied ? <Check size={10} /> : <Sparkles size={10} />}
                                    <span>{applied ? (isDanish ? "✓ Anvendt" : "✓ Applied") : (isDanish ? "Anvend ændring" : "Apply change")}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : m.content}
                  </div>
                );
              })}
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
              placeholder={isDanish ? "Spørg din sparring partner..." : "Ask your sparring partner..."}
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

  if (studioMode && open) {
    return (
      <>
        {/* Collapsed toggle stays docked */}
        {!open && chatContent}
        <FloatingStudioItem active={studioMode} className="">
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            dragConstraints={{ top: -9999, left: -9999, right: 9999, bottom: 9999 }}
            whileDrag={{ scale: 1.02, boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5)" }}
            className={`fixed bottom-8 right-8 w-[380px] rounded-2xl shadow-2xl backdrop-blur-xl border cursor-grab active:cursor-grabbing ${
              lm ? "bg-white/95 border-gray-200" : "bg-popover/95 border-border/30"
            }`}
            style={{ zIndex: 9999 }}
          >
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${lm ? "border-gray-200" : "border-border/20"}`}>
              <GripVertical size={12} className="text-muted-foreground/40" />
              <Sparkles size={13} className="text-primary" />
              <span className={`text-xs font-medium ${lm ? "text-gray-700" : "text-foreground/70"}`}>Sparring Partner</span>
              <button onClick={() => setOpen(false)} className="ml-auto">
                <ChevronDown size={13} className="text-muted-foreground/50" />
              </button>
            </div>
            <div className="px-3 pb-3 pt-2">
              {messages.length > 0 && (
                <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-2 mb-2">
                  {messages.map((m, i) => {
                    const msgSuggestionStartIdx2 = (() => {
                      let count = 0;
                      for (let j = 0; j < i; j++) { count += (messages[j].suggestions?.length || 0); }
                      return count;
                    })();
                    return (
                      <div key={i} className={`text-xs rounded-lg px-3 py-2 ${
                        m.role === "user"
                          ? lm ? "bg-primary/10 text-gray-800 ml-6" : "bg-primary/15 text-foreground/90 ml-6"
                          : lm ? "bg-gray-50 border border-gray-200 text-gray-700" : "bg-card/60 border border-border/20 text-foreground/80"
                      }`}>
                        {m.role === "assistant" ? (
                          <>
                            <div className="prose prose-sm max-w-none [&_p]:mb-1 [&_p]:text-xs [&_li]:text-xs [&_strong]:text-primary/80 [&_del]:text-destructive/60 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-2 [&_blockquote]:my-1">
                              <ReactMarkdown
                                components={{
                                  strong: ({ children }) => {
                                    const text = String(children);
                                    const isHighlightRef = text.startsWith('"') && text.endsWith('"');
                                    if (isHighlightRef) {
                                      return (
                                        <strong className="cursor-pointer hover:underline text-primary/90" onClick={() => scrollToHighlight(text.slice(1, -1))}>
                                          {children}
                                        </strong>
                                      );
                                    }
                                    return <strong>{children}</strong>;
                                  }
                                }}
                              >{m.content}</ReactMarkdown>
                            </div>
                            {m.suggestions && m.suggestions.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {m.suggestions.map((s, si) => {
                                  const gIdx = msgSuggestionStartIdx2 + si;
                                  const applied = appliedSuggestions.has(gIdx);
                                  return (
                                    <div key={si} className={`text-[10px] rounded-md overflow-hidden transition-all ${
                                      applied
                                        ? lm ? "border border-green-200" : "border border-green-500/20"
                                        : lm ? "border border-primary/20" : "border border-primary/20"
                                    }`}>
                                      <div className={`px-2 py-1 ${lm ? "bg-red-50/50" : "bg-destructive/5"}`}>
                                        <span className={`line-through ${lm ? "text-gray-400" : "text-foreground/30"}`}>{s.original}</span>
                                      </div>
                                      <div className={`px-2 py-1 ${lm ? "bg-green-50/50" : "bg-green-500/5"}`}>
                                        <span className={`${lm ? "text-gray-700" : "text-foreground/80"}`}>{s.replacement}</span>
                                      </div>
                                      <button
                                        disabled={applied}
                                        onClick={() => applySuggestion(s, gIdx)}
                                        className={`flex items-center gap-1.5 w-full px-2 py-1 transition-all ${
                                          applied
                                            ? lm ? "bg-green-50 text-green-700" : "bg-green-500/10 text-green-400"
                                            : lm ? "bg-primary/5 text-primary hover:bg-primary/10" : "bg-primary/10 text-primary hover:bg-primary/20"
                                        }`}
                                      >
                                        {applied ? <Check size={10} /> : <Sparkles size={10} />}
                                        <span>{applied ? (isDanish ? "✓ Anvendt" : "✓ Applied") : (isDanish ? "Anvend ændring" : "Apply change")}</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : m.content}
                      </div>
                    );
                  })}
                  {loading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3">
                      <Loader2 size={12} className="animate-spin" />
                      {isDanish ? "Tænker..." : "Thinking..."}
                    </div>
                  )}
                </div>
              )}
              {activeHighlights.length > 0 && (
                <button onClick={clearHighlights} className={`text-[10px] mb-2 px-2 py-1 rounded transition-colors ${lm ? "text-gray-500 hover:bg-gray-100" : "text-foreground/40 hover:bg-white/5"}`}>
                  {isDanish ? "Fjern markeringer" : "Clear highlights"} ({activeHighlights.length})
                </button>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder={isDanish ? "Spørg din sparring partner..." : "Ask your sparring partner..."}
                  className={`flex-1 text-xs px-3 py-2 rounded-lg outline-none transition-colors ${
                    lm ? "bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:border-primary/40" : "bg-card/40 border border-border/20 text-foreground/90 placeholder:text-foreground/30 focus:border-primary/40"
                  }`}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className={`p-2 rounded-lg transition-colors ${loading || !input.trim() ? "opacity-40 cursor-not-allowed" : lm ? "bg-primary text-white hover:bg-primary/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        </FloatingStudioItem>
      </>
    );
  }

  return chatContent;
};

export default DocumentAiChat;
