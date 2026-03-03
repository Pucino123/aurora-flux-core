import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Square, FastForward } from "lucide-react";
import FileMenu from "./FileMenu";
import TypographyPanel from "./TypographyPanel";
import StructureTools from "./StructureTools";
import InsertMenu from "./InsertMenu";
import AiToolsPanel from "./AiToolsPanel";
import ViewModeToggle from "./ViewModeToggle";
import EmojiTouchbar from "./EmojiTouchbar";
import ToolbarSegment from "./ToolbarSegment";
import ToolboxPopover from "./ToolboxPopover";
import FloatingStudioItem from "./FloatingStudioItem";
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
  documentId?: string;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  onDelete: () => void;
  studioMode: boolean;
  onToggleStudio: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
  isStreaming?: boolean;
  onStopStream?: () => void;
  onFinishStream?: () => void;
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
  commitRename, documentTitle, documentId = "", confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, zoom, onZoomChange, lightMode = false, onToggleLightMode,
  isStreaming = false, onStopStream, onFinishStream,
}: WordsToolbarProps) => {
  const lm = lightMode;
  const { visible, hiddenSegments, hideSegment, showSegment, showAll, reset } = useToolbarVisibility("words", ALL_SEGMENTS);

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
    ai: <AiToolsPanel editorRef={editorRef} onContentChange={onContentChange} lightMode={lm} documentTitle={documentTitle} documentId={documentId} />,
    view: (
      <ViewModeToggle
        studioMode={studioMode} onToggleStudio={onToggleStudio}
        zoom={zoom} onZoomChange={onZoomChange} lightMode={lm}
        editorRef={editorRef} documentTitle={documentTitle}
        onToggleLightMode={onToggleLightMode}
      />
    ),
  };

  const renderSegments = (isStudio: boolean) =>
    visible.map((id, i) => (
      <React.Fragment key={id}>
        {i > 0 && sep}
        <ToolbarSegment studioMode={isStudio} lightMode={lm} onHide={id === "ai" ? undefined : () => hideSegment(id)}>
          {segmentContent[id]}
        </ToolbarSegment>
      </React.Fragment>
    ));

  const streamingBanner = isStreaming && (
    <AnimatePresence>
      <motion.div
        key="stream-banner"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className={`flex items-center gap-1.5 ml-auto pl-2 border-l ${lm ? "border-gray-200" : "border-white/[0.08]"}`}
      >
        <span className={`text-[11px] font-medium flex items-center gap-1 ${lm ? "text-gray-500" : "text-foreground/50"}`}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Aura skriver…
        </span>
        <button
          onClick={onFinishStream}
          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${lm ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-primary/20 text-primary hover:bg-primary/30"}`}
        >
          <FastForward size={11} />
          Færdig nu
        </button>
        <button
          onClick={onStopStream}
          className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${lm ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-destructive/20 text-destructive hover:bg-destructive/30"}`}
        >
          <Square size={11} />
          Stop
        </button>
      </motion.div>
    </AnimatePresence>
  );

  const toolbarContent = (
    <>
      <AnimatePresence mode="sync">
        {renderSegments(studioMode)}
      </AnimatePresence>
      <ToolboxPopover hiddenSegments={hiddenSegments} segmentLabels={SEGMENT_LABELS} onRestore={showSegment} onRestoreAll={showAll} onReset={reset} lightMode={lm} />
      {streamingBanner}
    </>
  );

  if (studioMode) {
    return (
      <FloatingStudioItem active={studioMode} className="">
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.08}
          whileDrag={{ scale: 1.02, boxShadow: "0 25px 60px -12px rgba(0,0,0,0.5)" }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center gap-1 px-2 py-2 rounded-2xl backdrop-blur-xl border shadow-2xl max-w-[95vw] cursor-grab active:cursor-grabbing ${
            lm ? "bg-white/95 border-gray-200 shadow-gray-300/30" : "bg-popover/95 border-border/30"
          }`}
          style={{ overflow: "visible", zIndex: 9999 }}
        >
          {toolbarContent}
        </motion.div>
      </FloatingStudioItem>
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
      {toolbarContent}
    </motion.div>
  );
};

export default WordsToolbar;
