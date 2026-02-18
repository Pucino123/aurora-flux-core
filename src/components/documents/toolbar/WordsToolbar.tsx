import React from "react";
import { AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
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
}

const DEFAULT_ORDER = ["file", "typography", "structure", "insert", "emoji", "ai", "view"];

const WordsToolbar = ({
  editorRef, onContentChange, exec, renaming, setRenaming, renameValue, setRenameValue,
  commitRename, documentTitle, confirmDelete, setConfirmDelete, onDelete,
  studioMode, onToggleStudio, zoom, onZoomChange, lightMode = false,
}: WordsToolbarProps) => {
  const lm = lightMode;
  const { order, handleReorder } = useToolbarOrder("flux-words-toolbar-order", DEFAULT_ORDER);

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
        />
      </ToolbarSegment>
    ),
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      handleReorder(active.id as string, over.id as string);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 px-2 py-2 border-b transition-colors ${
      studioMode
        ? "fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-2xl bg-popover/95 backdrop-blur-xl border-border/30 shadow-2xl max-w-[95vw]"
        : lm ? "border-gray-200 bg-transparent" : "border-white/[0.08] bg-transparent"
    }`}>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={horizontalListSortingStrategy}>
          <AnimatePresence mode="sync">
            {order.map(id => segmentMap[id])}
          </AnimatePresence>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default WordsToolbar;
