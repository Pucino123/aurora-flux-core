import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import FileMenu from "./FileMenu";
import TypographyPanel from "./TypographyPanel";
import StructureTools from "./StructureTools";
import InsertMenu from "./InsertMenu";
import AiToolsPanel from "./AiToolsPanel";
import ViewModeToggle from "./ViewModeToggle";
import EmojiTouchbar from "./EmojiTouchbar";
import ToolbarSegment from "./ToolbarSegment";

interface WordsToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
  onContentChange: () => void;
  exec: (cmd: string, value?: string) => void;
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
  zoom: number;
  onZoomChange: (z: number) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
}

const SEGMENTS = ["file", "typography", "structure", "insert", "emoji", "ai", "view"];

const WordsToolbar = ({
  editorRef, onContentChange, exec, renaming, setRenaming, renameValue, setRenameValue,
  commitRename, documentTitle, confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, zoom, onZoomChange, lightMode = false, onToggleLightMode,
}: WordsToolbarProps) => {
  const lm = lightMode;

  const segmentContent: Record<string, React.ReactNode> = {
    file: (
      <FileMenu
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} documentTitle={documentTitle} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
        onDelete={onDelete} exec={exec} editorRef={editorRef} lightMode={lm}
      />
    ),
    typography: <TypographyPanel exec={exec} lightMode={lm} />,
    structure: <StructureTools exec={exec} editorRef={editorRef} lightMode={lm} />,
    insert: <InsertMenu exec={exec} lightMode={lm} />,
    emoji: <EmojiTouchbar onInsert={(emoji) => exec("insertText", emoji)} lightMode={lm} />,
    ai: <AiToolsPanel editorRef={editorRef} onContentChange={onContentChange} lightMode={lm} />,
    view: (
      <ViewModeToggle
        studioMode={studioMode} onToggleStudio={onToggleStudio}
        zoom={zoom} onZoomChange={onZoomChange} lightMode={lm}
        onToggleLightMode={onToggleLightMode}
      />
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

export default WordsToolbar;
