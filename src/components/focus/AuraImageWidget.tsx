import React from "react";
import { X, Download, ImageIcon } from "lucide-react";
import DraggableWidget from "./DraggableWidget";

interface AuraImageWidgetProps {
  id: string;
  url: string;
  prompt: string;
  onRemove: (id: string) => void;
}

const AuraImageWidget: React.FC<AuraImageWidgetProps> = ({ id, url, prompt, onRemove }) => {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-image-${Date.now()}.png`;
    a.click();
  };

  const shortPrompt = prompt.length > 48 ? prompt.slice(0, 45) + "…" : prompt;

  return (
    <DraggableWidget
      id={`aura-image-${id}`}
      title={shortPrompt}
      defaultPosition={{
        x: Math.round(window.innerWidth * 0.1 + Math.random() * 200),
        y: Math.round(window.innerHeight * 0.15 + Math.random() * 100),
      }}
      defaultSize={{ w: 340, h: 320 }}
    >
      <div className="flex flex-col h-full rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5 min-w-0">
            <ImageIcon size={11} className="text-purple-300/70 shrink-0" />
            <span className="text-[10px] text-white/50 truncate">{shortPrompt}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleDownload}
              className="p-1 rounded-full text-white/30 hover:text-white/70 hover:bg-white/10 transition-all"
              title="Download image"
            >
              <Download size={11} />
            </button>
            <button
              onClick={() => onRemove(id)}
              className="p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-white/10 transition-all"
              title="Remove widget"
            >
              <X size={11} />
            </button>
          </div>
        </div>
        {/* Image */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-2">
          <img
            src={url}
            alt={prompt}
            className="max-w-full max-h-full object-contain rounded-lg"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
          />
        </div>
      </div>
    </DraggableWidget>
  );
};

export default AuraImageWidget;
