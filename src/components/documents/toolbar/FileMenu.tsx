import React from "react";
import { Pencil, Trash2, Check, X, Download, Undo, Redo } from "lucide-react";
import { motion } from "framer-motion";
import ToolbarSegment from "./ToolbarSegment";
import ToolbarButton from "./ToolbarButton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface FileMenuProps {
  renaming: boolean;
  setRenaming: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  documentTitle: string;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: () => void;
  exec?: (cmd: string, value?: string) => void;
  editorRef?: React.RefObject<HTMLDivElement>;
  lightMode?: boolean;
}

const FileMenu = ({
  renaming, setRenaming, renameValue, setRenameValue, commitRename,
  documentTitle, confirmDelete, setConfirmDelete, onDelete, exec, editorRef, lightMode = false
}: FileMenuProps) => {
  const lm = lightMode;

  const exportTxt = () => {
    const text = editorRef?.current?.innerText || "";
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${documentTitle}.txt`;
    a.click();
  };

  const exportHtml = () => {
    const html = editorRef?.current?.innerHTML || "";
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${documentTitle}.html`;
    a.click();
  };

  return (
    <ToolbarSegment>
      {exec && (
        <>
          <ToolbarButton icon={<Undo size={14} />} label="Undo (⌘Z)" onClick={() => exec("undo")} lightMode={lm} />
          <ToolbarButton icon={<Redo size={14} />} label="Redo (⌘⇧Z)" onClick={() => exec("redo")} lightMode={lm} />
          <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />
        </>
      )}

      {renaming ? (
        <div className="flex items-center gap-1">
          <input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className={`text-[11px] bg-transparent border-b-2 border-primary/30 outline-none px-1 py-0.5 w-[120px] transition-colors focus:border-primary/60 ${lm ? "text-gray-900" : "text-foreground"}`}
            autoFocus
          />
          <button onClick={commitRename} className="p-1 rounded-md hover:bg-primary/10 text-primary"><Check size={11} /></button>
        </div>
      ) : (
        <ToolbarButton icon={<Pencil size={13} />} label="Rename" onClick={() => { setRenameValue(documentTitle); setRenaming(true); }} lightMode={lm} />
      )}

      {editorRef && (
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <ToolbarButton icon={<Download size={13} />} label="Export" onClick={() => {}} lightMode={lm} />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1.5 z-[300] bg-popover border-border shadow-xl" align="start" sideOffset={6}>
            <button onClick={exportTxt} className={`w-full text-left px-3 py-1.5 text-[11px] rounded-md transition-colors ${lm ? "hover:bg-gray-100 text-gray-700" : "hover:bg-secondary/40 text-foreground/80"}`}>
              Export as TXT
            </button>
            <button onClick={exportHtml} className={`w-full text-left px-3 py-1.5 text-[11px] rounded-md transition-colors ${lm ? "hover:bg-gray-100 text-gray-700" : "hover:bg-secondary/40 text-foreground/80"}`}>
              Export as HTML
            </button>
            <button onClick={() => window.print()} className={`w-full text-left px-3 py-1.5 text-[11px] rounded-md transition-colors ${lm ? "hover:bg-gray-100 text-gray-700" : "hover:bg-secondary/40 text-foreground/80"}`}>
              Print / PDF
            </button>
          </PopoverContent>
        </Popover>
      )}

      <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />

      {confirmDelete ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1">
          <span className="text-[10px] text-destructive/80">Delete?</span>
          <button onClick={onDelete} className="p-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Check size={11} /></button>
          <button onClick={() => setConfirmDelete(false)} className={`p-1 rounded-md transition-colors ${lm ? "hover:bg-gray-100 text-gray-500" : "hover:bg-white/[0.1] text-foreground/50"}`}><X size={11} /></button>
        </motion.div>
      ) : (
        <ToolbarButton icon={<Trash2 size={13} />} label="Delete" onClick={() => setConfirmDelete(true)} lightMode={lm} />
      )}

      <div className={`flex items-center gap-1 ml-1 ${lm ? "text-gray-400" : "text-foreground/30"}`}>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse" />
        <span className="text-[9px] hidden md:inline">Auto-saved</span>
      </div>
    </ToolbarSegment>
  );
};

export default FileMenu;
