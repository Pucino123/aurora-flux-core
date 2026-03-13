import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, ChevronDown, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import DraggableWidget from "./DraggableWidget";

interface SearchResult {
  query: string;
  answer: string;
  loading: boolean;
}

const SearchInner = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setResult({ query: q, answer: "", loading: true });
    setExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          messages: [
            {
              role: "system",
              content:
                "Du er en hurtig og præcis assistent. Svar kortfattet og klart på dansk. Brug markdown til formatering når det hjælper læsbarheden. Hold svar under 300 ord med mindre brugeren beder om mere.",
            },
            { role: "user", content: q },
          ],
        },
      });

      if (error) throw error;
      const answer =
        data?.choices?.[0]?.message?.content ||
        data?.content ||
        data?.answer ||
        "Ingen svar tilgængeligt.";
      setResult({ query: q, answer, loading: false });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setResult({ query: q, answer: "Der opstod en fejl. Prøv igen.", loading: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch(query);
    if (e.key === "Escape") {
      setExpanded(false);
      setResult(null);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const clear = () => {
    setQuery("");
    setResult(null);
    setExpanded(false);
    abortRef.current?.abort();
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col w-full">
      {/* Search bar row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Search size={13} className="text-white/40 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Søg på internettet"
          className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/35 outline-none min-w-0"
          style={{ fontWeight: 400, letterSpacing: "0.01em" }}
          onPointerDown={e => e.stopPropagation()}
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {query ? (
            <button
              onClick={clear}
              className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-md hover:bg-white/10"
            >
              <X size={12} />
            </button>
          ) : (
            <button
              onClick={() => handleSearch(query)}
              className="text-white/25 hover:text-white/50 transition-colors p-1 rounded-md hover:bg-white/10"
            >
              <Globe size={13} />
            </button>
          )}
          {query && (
            <button
              onClick={() => handleSearch(query)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
              style={{ background: "rgba(139,92,246,0.25)", color: "rgba(196,170,255,0.9)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.40)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(139,92,246,0.25)"; }}
            >
              Søg
            </button>
          )}
        </div>
      </div>

      {/* Answer panel */}
      <AnimatePresence>
        {expanded && result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.08] px-3 py-3 max-h-[260px] overflow-y-auto">
              {/* Query chip */}
              <div className="flex items-center gap-1.5 mb-2.5">
                <Search size={10} className="text-white/30 shrink-0" />
                <span className="text-[10px] text-white/35 truncate italic">{result.query}</span>
              </div>

              {result.loading ? (
                <div className="flex items-center gap-2 text-white/40 py-1">
                  <Loader2 size={13} className="animate-spin" />
                  <span className="text-[12px]">Søger…</span>
                </div>
              ) : (
                <div className="text-[12.5px] text-white/75 leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="text-white/90 font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li className="text-white/70">{children}</li>,
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded text-[11px] font-mono"
                          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,180,255,0.9)" }}>
                          {children}
                        </code>
                      ),
                      h1: ({ children }) => <h1 className="text-[14px] font-bold text-white mb-1.5">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-[13px] font-semibold text-white/90 mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-[12px] font-semibold text-white/80 mb-0.5">{children}</h3>,
                    }}
                  >
                    {result.answer}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {!result.loading && (
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.06]">
                <span className="text-[9px] text-white/20">Drevet af Aura AI</span>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
                >
                  <ChevronDown size={10} />
                  Luk
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SearchWidget = () => (
  <DraggableWidget
    id="search"
    title="Søg"
    defaultPosition={{ x: window.innerWidth / 2 - 240, y: 32 }}
    defaultSize={{ w: 480, h: 52 }}
    autoHeight
    hideHeader
    overflowVisible
  >
    <SearchInner />
  </DraggableWidget>
);

export default SearchWidget;
