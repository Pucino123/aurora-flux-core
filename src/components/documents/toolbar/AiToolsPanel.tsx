import React, { useState } from "react";
import { Sparkles, RefreshCw, Maximize2, Minimize2, Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ToolbarSegment from "./ToolbarSegment";
import ToolbarButton from "./ToolbarButton";
import { toast } from "sonner";

interface AiToolsPanelProps {
  editorRef: React.RefObject<HTMLDivElement>;
  onContentChange: () => void;
  lightMode?: boolean;
}

const AI_ACTIONS = [
  { key: "rewrite", label: "AI Rewrite", icon: <RefreshCw size={13} /> },
  { key: "improve", label: "Improve Tone", icon: <Sparkles size={13} /> },
  { key: "summarize", label: "Summarize", icon: <Minimize2 size={13} /> },
  { key: "expand", label: "Expand", icon: <Maximize2 size={13} /> },
  { key: "shorten", label: "Shorten", icon: <Minimize2 size={13} /> },
  { key: "translate", label: "Translate", icon: <Languages size={13} /> },
];

const AiToolsPanel = ({ editorRef, onContentChange, lightMode = false }: AiToolsPanelProps) => {
  const lm = lightMode;
  const [loading, setLoading] = useState<string | null>(null);

  const getSelectedText = (): string => {
    const selection = window.getSelection();
    return selection?.toString() || "";
  };

  const handleAiAction = async (action: string) => {
    const text = getSelectedText();
    if (!text) {
      toast.info("Select some text first to use AI tools");
      return;
    }

    setLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("document-ai", {
        body: { action, text },
      });

      if (error) throw error;
      if (data?.result) {
        document.execCommand("insertText", false, data.result);
        onContentChange();
        toast.success(`AI ${action} applied`);
      }
    } catch (err: any) {
      console.error("AI tool error:", err);
      toast.error("AI tool failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <ToolbarSegment>
      {AI_ACTIONS.map(a => (
        <ToolbarButton
          key={a.key}
          icon={loading === a.key ? <Loader2 size={13} className="animate-spin" /> : a.icon}
          label={a.label}
          onClick={() => handleAiAction(a.key)}
          disabled={loading !== null}
          lightMode={lm}
        />
      ))}
    </ToolbarSegment>
  );
};

export default AiToolsPanel;
