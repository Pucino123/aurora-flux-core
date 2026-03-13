import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ScanFace, MoreHorizontal, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface SearchResult {
  query: string;
  answer: string;
  loading: boolean;
}

const SearchWidget = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;

    // Cancel any in-flight request
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
    <motion.div
      layout
      className="w-full"
      style={{ minWidth: 280, maxWidth: 480 }}
    >
      {/* Search pill */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-full"
        style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        }}
      >
        <Search size={14} className="text-white/40 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Søg på internettet"
          className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/35 outline-none min-w-0"
          style={{ fontWeight: 400, letterSpacing: "0.01em" }}
        />
        {query ? (
          <button onClick={clear} className="text-white/30 hover:text-white/70 transition-colors shrink-0">
            <X size={13} />
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button className="text-white/25 hover:text-white/50 transition-colors">
              <ScanFace size={14} />
            </button>
            <button className="text-white/25 hover:text-white/50 transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Answer panel */}
      <AnimatePresence>
        {expanded && result && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="mt-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(10,8,20,0.88)",
              backdropFilter: "blur(32px)",
              WebkitBackdropFilter: "blur(32px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              maxHeight: 320,
              overflowY: "auto",
            }}
          >
            <div className="p-4">
              {/* Query chip */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Search size={10} className="text-primary" />
                </div>
                <span className="text-[11px] text-white/40 truncate">{result.query}</span>
              </div>

              {/* Answer */}
              {result.loading ? (
                <div className="flex items-center gap-2 text-white/40 py-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[12px]">Søger…</span>
                </div>
              ) : (
                <div
                  className="text-[13px] text-white/80 leading-relaxed prose prose-sm prose-invert max-w-none"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-white/80">{children}</p>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="text-white/75">{children}</li>,
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded text-[11px] font-mono" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(200,180,255,0.9)" }}>
                          {children}
                        </code>
                      ),
                      h1: ({ children }) => <h1 className="text-[15px] font-bold text-white mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-[14px] font-semibold text-white mb-1.5">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-[13px] font-semibold text-white/90 mb-1">{children}</h3>,
                    }}
                  >
                    {result.answer}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Footer */}
            {!result.loading && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.07]">
                <span className="text-[10px] text-white/25">Drevet af Aura AI</span>
                <button
                  onClick={() => { setExpanded(false); }}
                  className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors"
                >
                  <ChevronDown size={11} />
                  Luk
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SearchWidget;
