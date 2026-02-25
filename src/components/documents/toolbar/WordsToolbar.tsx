import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useToolbarOrder } from "@/hooks/useToolbarOrder";
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

const DEFAULT_ORDER = ["file", "typography", "structure", "insert", "emoji", "ai", "view"];

const WordsToolbar = ({
  editorRef, onContentChange, exec, renaming, setRenaming, renameValue, setRenameValue,
  commitRename, documentTitle, confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, zoom, onZoomChange, lightMode = false, onToggleLightMode,
}: WordsToolbarProps) => {
  const lm = lightMode;
  const { order, handleReorder } = useToolbarOrder("flux-words-toolbar-order", DEFAULT_ORDER);
  const [activeId, setActiveId] = useState<string | null>(null);

  /* Segment content builders — used both for live segments and drag overlay */
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

  const onDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleReorder(active.id as string, over.id as string);
    }
  };

  // In studio mode: free-drag segments, no DndContext reorder
  if (studioMode) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-2xl bg-popover/95 backdrop-blur-xl border border-border/30 shadow-2xl max-w-[95vw]">
        <AnimatePresence mode="sync">
          {order.map(id => (
            <ToolbarSegment key={id} id={id} sortable studioMode>
              {segmentContent[id]}
            </ToolbarSegment>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex flex-wrap items-center gap-1.5 px-2 py-2 border-b transition-colors ${
        lm ? "border-gray-200 bg-transparent" : "border-white/[0.08] bg-transparent"
      }`}>
      <DndContext collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <AnimatePresence mode="sync">
            {order.map(id => (
              <ToolbarSegment key={id} id={id} sortable>
                {segmentContent[id]}
              </ToolbarSegment>
            ))}
          </AnimatePresence>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
          {activeId ? (
            <motion.div
              initial={{ scale: 1.05, rotate: 1.5 }}
              animate={{ scale: 1.06, rotate: -0.5 }}
              className={`flex items-center gap-0.5 px-1.5 py-1 rounded-xl backdrop-blur-[16px] border shadow-2xl pointer-events-none ${
                lm
                  ? "bg-white/95 border-primary/30"
                  : "bg-popover/95 border-primary/40"
              }`}
              style={{ boxShadow: "0 20px 50px -10px rgba(0,0,0,0.4), 0 0 24px rgba(139,92,246,0.2)" }}
            >
              {segmentContent[activeId]}
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </motion.div>
  );
};

export default WordsToolbar;
