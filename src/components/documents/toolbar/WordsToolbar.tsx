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
import ToolboxPopover from "./ToolboxPopover";
import { useToolbarVisibility } from "@/hooks/useToolbarVisibility";
import { isDanish } from "@/lib/i18n";

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

const ALL_SEGMENTS = ["file", "typography", "structure", "insert", "emoji", "ai", "view"];

const SEGMENT_LABELS: Record<string, string> = {
  file: isDanish ? "Fil" : "File",
  typography: isDanish ? "Typografi" : "Typography",
  structure: isDanish ? "Struktur" : "Structure",
  insert: isDanish ? "Indsæt" : "Insert",
  emoji: "Emoji",
  ai: "AI",
  view: isDanish ? "Visning" : "View",
};

const WordsToolbar = ({
  editorRef, onContentChange, exec, renaming, setRenaming, renameValue, setRenameValue,
  commitRename, documentTitle, confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, zoom, onZoomChange, lightMode = false, onToggleLightMode,
}: WordsToolbarProps) => {
  const lm = lightMode;
  const { visible, hiddenSegments, hideSegment, showSegment, showAll } = useToolbarVisibility("words", ALL_SEGMENTS);

  const sep = <div className={`w-px h-5 mx-1 ${lm ? "bg-gray-200" : "bg-white/[0.08]"}`} />;

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

  const renderSegments = (isStudio: boolean) =>
    visible.map((id, i) => (
      <React.Fragment key={id}>
        {i > 0 && sep}
        <ToolbarSegment studioMode={isStudio} lightMode={lm} onHide={() => hideSegment(id)}>
          {segmentContent[id]}
        </ToolbarSegment>
      </React.Fragment>
    ));

  if (studioMode) {
    return (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        whileDrag={{ scale: 1.02, boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5)" }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-wrap items-center gap-1 px-2 py-2 rounded-2xl bg-popover/95 backdrop-blur-xl border border-border/30 shadow-2xl max-w-[95vw] cursor-grab active:cursor-grabbing"
        style={{ overflow: "visible" }}
      >
        <AnimatePresence mode="sync">
          {renderSegments(true)}
        </AnimatePresence>
        <ToolboxPopover hiddenSegments={hiddenSegments} segmentLabels={SEGMENT_LABELS} onRestore={showSegment} onRestoreAll={showAll} lightMode={lm} />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex flex-wrap items-center gap-1 px-2 py-2 border-b transition-colors ${
        lm ? "border-gray-200 bg-transparent" : "border-white/[0.08] bg-transparent"
      }`}
    >
      <AnimatePresence mode="sync">
        {renderSegments(false)}
      </AnimatePresence>
      <ToolboxPopover hiddenSegments={hiddenSegments} segmentLabels={SEGMENT_LABELS} onRestore={showSegment} onRestoreAll={showAll} lightMode={lm} />
    </motion.div>
  );
};

export default WordsToolbar;
