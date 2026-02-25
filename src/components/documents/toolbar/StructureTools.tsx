import React from "react";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, CheckSquare, IndentIncrease, IndentDecrease, Heading1, Heading2, Heading3, Type, Minus, Quote, SeparatorHorizontal } from "lucide-react";
import ToolbarButton from "./ToolbarButton";

interface StructureToolsProps {
  exec: (cmd: string, value?: string) => void;
  editorRef: React.RefObject<HTMLDivElement>;
  lightMode?: boolean;
}

const StructureTools = ({ exec, editorRef, lightMode = false }: StructureToolsProps) => {
  const lm = lightMode;
  const sep = <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />;

  const insertChecklist = () => {
    const checkbox = '<li><span class="doc-checkbox" data-checked="false" contenteditable="false">☐</span> </li>';
    exec("insertHTML", `<ul style="list-style:none;padding-left:4px;">${checkbox}</ul>`);
  };

  const insertCallout = () => {
    exec("insertHTML", '<div style="background:hsl(225 75% 55% / 0.08);border-left:3px solid hsl(225 75% 55%);border-radius:8px;padding:12px 16px;margin:8px 0;">💡 Callout text</div>');
  };

  return (
    <>
      <ToolbarButton icon={<Heading1 size={14} />} label="Heading 1" onClick={() => exec("formatBlock", "h1")} lightMode={lm} />
      <ToolbarButton icon={<Heading2 size={14} />} label="Heading 2" onClick={() => exec("formatBlock", "h2")} lightMode={lm} />
      <ToolbarButton icon={<Heading3 size={14} />} label="Heading 3" onClick={() => exec("formatBlock", "h3")} lightMode={lm} />
      <ToolbarButton icon={<Type size={14} />} label="Paragraph" onClick={() => exec("formatBlock", "p")} lightMode={lm} />
      {sep}
      <ToolbarButton icon={<AlignLeft size={14} />} label="Align left" onClick={() => exec("justifyLeft")} lightMode={lm} />
      <ToolbarButton icon={<AlignCenter size={14} />} label="Align center" onClick={() => exec("justifyCenter")} lightMode={lm} />
      <ToolbarButton icon={<AlignRight size={14} />} label="Align right" onClick={() => exec("justifyRight")} lightMode={lm} />
      <ToolbarButton icon={<AlignJustify size={14} />} label="Justify" onClick={() => exec("justifyFull")} lightMode={lm} />
      {sep}
      <ToolbarButton icon={<List size={14} />} label="Bullet list" onClick={() => exec("insertUnorderedList")} lightMode={lm} />
      <ToolbarButton icon={<ListOrdered size={14} />} label="Numbered list" onClick={() => exec("insertOrderedList")} lightMode={lm} />
      <ToolbarButton icon={<CheckSquare size={14} />} label="Checklist" onClick={insertChecklist} lightMode={lm} />
      {sep}
      <ToolbarButton icon={<IndentIncrease size={14} />} label="Indent" onClick={() => exec("indent")} lightMode={lm} />
      <ToolbarButton icon={<IndentDecrease size={14} />} label="Outdent" onClick={() => exec("outdent")} lightMode={lm} />
      {sep}
      <ToolbarButton icon={<Quote size={14} />} label="Blockquote" onClick={() => exec("formatBlock", "blockquote")} lightMode={lm} />
      <ToolbarButton icon={<Minus size={14} />} label="Divider" onClick={() => exec("insertHorizontalRule")} lightMode={lm} />
      <ToolbarButton icon={<SeparatorHorizontal size={14} />} label="Callout" onClick={insertCallout} lightMode={lm} />
    </>
  );
};

export default StructureTools;
