import React, { useState } from "react";
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Palette, PaintBucket, ArrowDownAZ, ArrowUpAZ, Filter, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ToolbarSegment from "./ToolbarSegment";
import ToolbarButton from "./ToolbarButton";
import ColorPickerPopover from "./ColorPickerPopover";
import FileMenu from "./FileMenu";
import ViewModeToggle from "./ViewModeToggle";
import EmojiTouchbar from "./EmojiTouchbar";

interface SheetsToolbarProps {
  onBoldToggle: () => void;
  onItalicToggle: () => void;
  onUnderlineToggle: () => void;
  onStrikethroughToggle: () => void;
  onTextColor: (c: string) => void;
  onBgColor: (c: string) => void;
  onTextAlign: (a: string) => void;
  onFontSize: (s: string) => void;
  onSort?: (dir: "asc" | "desc") => void;
  onFilter?: () => void;
  renaming: boolean;
  setRenaming: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  documentTitle: string;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: () => void;
  studioMode: boolean;
  onToggleStudio: () => void;
  onExportCsv?: () => void;
  onInsertText?: (text: string) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
}

const SEGMENTS = ["file", "cell-format", "emoji", "data-tools", "view"];

const SheetsToolbar = ({
  onBoldToggle, onItalicToggle, onUnderlineToggle, onStrikethroughToggle,
  onTextColor, onBgColor, onTextAlign, onFontSize, onSort, onFilter,
  renaming, setRenaming, renameValue, setRenameValue, commitRename,
  documentTitle, confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, onExportCsv, onInsertText,
  lightMode = false, onToggleLightMode,
}: SheetsToolbarProps) => {
  const lm = lightMode;
  const [fs, setFs] = useState("12");

  const sep = <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />;
  const selectCls = `text-[11px] h-7 px-1.5 rounded-lg border outline-none transition-colors ${
    lm
      ? "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
      : "border-white/[0.1] bg-white/[0.06] text-foreground/80 hover:bg-white/[0.1]"
  }`;

  const segmentContent: Record<string, React.ReactNode> = {
    file: (
      <FileMenu
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} documentTitle={documentTitle} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
        onDelete={onDelete} lightMode={lm}
      />
    ),
    "cell-format": (
      <>
        <select value={fs} onChange={e => { setFs(e.target.value); onFontSize(e.target.value); }} className={`${selectCls} w-[50px]`}>
          {["8", "10", "12", "14", "16", "18", "20", "24", "28", "36"].map(s => (<option key={s} value={s}>{s}</option>))}
        </select>
        {sep}
        <ToolbarButton icon={<Bold size={14} />} label="Bold" onClick={onBoldToggle} lightMode={lm} />
        <ToolbarButton icon={<Italic size={14} />} label="Italic" onClick={onItalicToggle} lightMode={lm} />
        <ToolbarButton icon={<Underline size={14} />} label="Underline" onClick={onUnderlineToggle} lightMode={lm} />
        <ToolbarButton icon={<Strikethrough size={14} />} label="Strikethrough" onClick={onStrikethroughToggle} lightMode={lm} />
        {sep}
        <ColorPickerPopover icon={<Palette size={14} />} label="Text color" onSelect={onTextColor} lightMode={lm} />
        <ColorPickerPopover icon={<PaintBucket size={14} />} label="Fill color" onSelect={onBgColor} lightMode={lm} />
        {sep}
        <ToolbarButton icon={<AlignLeft size={14} />} label="Align left" onClick={() => onTextAlign("left")} lightMode={lm} />
        <ToolbarButton icon={<AlignCenter size={14} />} label="Align center" onClick={() => onTextAlign("center")} lightMode={lm} />
        <ToolbarButton icon={<AlignRight size={14} />} label="Align right" onClick={() => onTextAlign("right")} lightMode={lm} />
      </>
    ),
    emoji: <EmojiTouchbar onInsert={(emoji) => onInsertText?.(emoji)} lightMode={lm} />,
    "data-tools": (
      <>
        <ToolbarButton icon={<ArrowDownAZ size={14} />} label="Sort A-Z" onClick={() => onSort?.("asc")} lightMode={lm} />
        <ToolbarButton icon={<ArrowUpAZ size={14} />} label="Sort Z-A" onClick={() => onSort?.("desc")} lightMode={lm} />
        <ToolbarButton icon={<Filter size={14} />} label="Filter" onClick={() => onFilter?.()} lightMode={lm} />
      </>
    ),
    view: (
      <>
        <ViewModeToggle studioMode={studioMode} onToggleStudio={onToggleStudio} zoom={100} onZoomChange={() => {}} lightMode={lm} onToggleLightMode={onToggleLightMode} />
        {onExportCsv && (<ToolbarButton icon={<Download size={14} />} label="Export CSV" onClick={onExportCsv} lightMode={lm} />)}
      </>
    ),
  };

  if (studioMode) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        whileDrag={{ scale: 1.02, boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5)" }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-2xl bg-popover/95 backdrop-blur-xl border border-border/30 shadow-2xl max-w-[95vw] cursor-grab active:cursor-grabbing overflow-visible"
        style={{ overflow: "visible" }}
      >
        <AnimatePresence mode="sync">
          {SEGMENTS.map(id => (
            <ToolbarSegment key={id} studioMode lightMode={lm}>
              {segmentContent[id]}
            </ToolbarSegment>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex flex-wrap items-center gap-1.5 px-2 py-2 border-b transition-colors ${
        lm ? "border-gray-200 bg-transparent" : "border-white/[0.08] bg-transparent"
      }`}
    >
      <AnimatePresence mode="sync">
        {SEGMENTS.map(id => (
          <ToolbarSegment key={id} lightMode={lm}>
            {segmentContent[id]}
          </ToolbarSegment>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default SheetsToolbar;
