import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const db = supabase as any;

interface ThreadMessage {
  id: string;
  user_message: string;
  persona_reply: string;
  created_at: string;
}

interface CouncilThreadProps {
  responseId: string;
  personaKey: string;
  personaName: string;
  personaColor: string;
  ideaContent: string;
  personaAnalysis: string;
  threads: ThreadMessage[];
  userId: string;
  onThreadAdded: (thread: ThreadMessage) => void;
}

const CouncilThread = ({
  responseId, personaKey, personaName, personaColor,
  ideaContent, personaAnalysis, threads, userId, onThreadAdded
}: CouncilThreadProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReply = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "council-thread",
          idea: ideaContent,
          persona_key: personaKey,
          persona_analysis: personaAnalysis,
          user_message: input.trim(),
        },
      });

      if (error) throw error;

      const reply = data?.reply || "...";

      const { data: inserted, error: dbErr } = await db
        .from("council_threads")
        .insert({
          response_id: responseId,
          user_id: userId,
          persona_key: personaKey,
          user_message: input.trim(),
          persona_reply: reply,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      onThreadAdded({
        id: inserted.id,
        user_message: inserted.user_message,
        persona_reply: inserted.persona_reply,
        created_at: inserted.created_at,
      });

      setInput("");
    } catch (e: any) {
      console.error("Thread error:", e);
      toast.error(t("council.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle size={12} />
        {t("council.reply_to")} {personaName}
        {threads.length > 0 && <span className="text-[9px] opacity-60">({threads.length})</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Thread history */}
            {threads.map((msg) => (
              <div key={msg.id} className="mt-2 space-y-1">
                <div className="text-[11px] bg-secondary/50 rounded-lg px-2 py-1.5">
                  <span className="font-medium text-foreground">{t("council.you")}:</span>{" "}
                  <span className="text-muted-foreground">{msg.user_message}</span>
                </div>
                <div
                  className="text-[11px] rounded-lg px-2 py-1.5"
                  style={{ backgroundColor: `${personaColor}15`, borderLeft: `2px solid ${personaColor}` }}
                >
                  <div className="prose prose-xs max-w-none text-muted-foreground">
                    <ReactMarkdown>{msg.persona_reply}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {/* Reply input */}
            <div className="mt-2 flex gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleReply(); }}
                placeholder={`${t("council.ask")} ${personaName}...`}
                className="flex-1 text-[11px] bg-secondary/30 rounded-lg px-2 py-1.5 outline-none"
                disabled={loading}
              />
              <button
                onClick={handleReply}
                disabled={loading || !input.trim()}
                className="p-1.5 rounded-lg hover:bg-secondary/50 disabled:opacity-40"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CouncilThread;
