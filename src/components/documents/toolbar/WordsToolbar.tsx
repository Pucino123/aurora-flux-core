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

  const SEGMENT_LABELS: Record<string, string> = {
    file: "File", typography: "Text", structure: "Structure",
    insert: "Insert", emoji: "Emoji", ai: "AI", view: "View",
  };

  const segmentMap: Record<string, React.ReactNode> = {
    file: (
      <ToolbarSegment key="file" id="file" sortable>
        <FileMenu
          renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
          commitRename={commitRename} documentTitle={documentTitle} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
          onDelete={onDelete} exec={exec} editorRef={editorRef} lightMode={lm}
        />
      </ToolbarSegment>
    ),
    typography: (
      <ToolbarSegment key="typography" id="typography" sortable>
        <TypographyPanel exec={exec} lightMode={lm} />
      </ToolbarSegment>
    ),
    structure: (
      <ToolbarSegment key="structure" id="structure" sortable>
        <StructureTools exec={exec} editorRef={editorRef} lightMode={lm} />
      </ToolbarSegment>
    ),
    insert: (
      <ToolbarSegment key="insert" id="insert" sortable>
        <InsertMenu exec={exec} lightMode={lm} />
      </ToolbarSegment>
    ),
    emoji: (
      <ToolbarSegment key="emoji" id="emoji" sortable>
        <EmojiTouchbar onInsert={(emoji) => exec("insertText", emoji)} lightMode={lm} />
      </ToolbarSegment>
    ),
    ai: (
      <ToolbarSegment key="ai" id="ai" sortable>
        <AiToolsPanel editorRef={editorRef} onContentChange={onContentChange} lightMode={lm} />
      </ToolbarSegment>
    ),
    view: (
      <ToolbarSegment key="view" id="view" sortable>
        <ViewModeToggle
          studioMode={studioMode} onToggleStudio={onToggleStudio}
          zoom={zoom} onZoomChange={onZoomChange} lightMode={lm}
          onToggleLightMode={onToggleLightMode}
        />
      </ToolbarSegment>
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

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex flex-wrap items-center gap-1.5 px-2 py-2 border-b transition-colors ${
        studioMode
          ? "fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-2xl bg-popover/95 backdrop-blur-xl border-border/30 shadow-2xl max-w-[95vw]"
          : lm ? "border-gray-200 bg-transparent" : "border-white/[0.08] bg-transparent"
      }`}>
      <DndContext collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <AnimatePresence mode="sync">
            {order.map(id => segmentMap[id])}
          </AnimatePresence>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }}>
          {activeId ? (
            <motion.div
              initial={{ scale: 1.05, rotate: 2 }}
              animate={{ scale: 1.08, rotate: -1 }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border shadow-2xl pointer-events-none ${
                lm
                  ? "bg-white/90 border-primary/30 shadow-primary/10"
                  : "bg-popover/90 border-primary/40 shadow-primary/20"
              }`}
            >
              <span className={`text-[10px] font-semibold ${lm ? "text-primary" : "text-primary"}`}>
                {SEGMENT_LABELS[activeId] || activeId}
              </span>
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </motion.div>
  );
};

export default WordsToolbar;
