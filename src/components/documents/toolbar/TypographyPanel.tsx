import React, { useState } from "react";
import { Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Palette, Highlighter, RemoveFormatting } from "lucide-react";
import ToolbarSegment from "./ToolbarSegment";
import ToolbarButton from "./ToolbarButton";
import ColorPickerPopover from "./ColorPickerPopover";

const FONTS = [
  "Inter", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana",
  "Trebuchet MS", "Comic Sans MS", "Impact", "Lucida Console",
];

interface TypographyPanelProps {
  exec: (cmd: string, value?: string) => void;
  lightMode?: boolean;
}

const TypographyPanel = ({ exec, lightMode = false }: TypographyPanelProps) => {
  const lm = lightMode;
  const [fontSize, setFontSize] = useState("3");
  const [fontFamily, setFontFamily] = useState("Inter");

  const selectCls = `text-[11px] h-7 px-1.5 rounded-lg border outline-none transition-colors ${
    lm
      ? "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
      : "border-white/[0.1] bg-white/[0.06] text-foreground/80 hover:bg-white/[0.1]"
  }`;

  return (
    <ToolbarSegment>
      <select
        value={fontFamily}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => { setFontFamily(e.target.value); exec("fontName", e.target.value); }}
        className={`${selectCls} w-[100px] md:w-[120px]`}
      >
        {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>

      <select
        value={fontSize}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => { setFontSize(e.target.value); exec("fontSize", e.target.value); }}
        className={`${selectCls} w-[50px]`}
      >
        <option value="1">8</option>
        <option value="2">10</option>
        <option value="3">12</option>
        <option value="4">14</option>
        <option value="5">18</option>
        <option value="6">24</option>
        <option value="7">36</option>
      </select>

      <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />

      <ToolbarButton icon={<Bold size={14} />} label="Bold (⌘B)" onClick={() => exec("bold")} lightMode={lm} />
      <ToolbarButton icon={<Italic size={14} />} label="Italic (⌘I)" onClick={() => exec("italic")} lightMode={lm} />
      <ToolbarButton icon={<Underline size={14} />} label="Underline (⌘U)" onClick={() => exec("underline")} lightMode={lm} />
      <ToolbarButton icon={<Strikethrough size={14} />} label="Strikethrough (⌘D)" onClick={() => exec("strikeThrough")} lightMode={lm} />

      <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />

      <ToolbarButton icon={<Subscript size={14} />} label="Subscript" onClick={() => exec("subscript")} lightMode={lm} />
      <ToolbarButton icon={<Superscript size={14} />} label="Superscript" onClick={() => exec("superscript")} lightMode={lm} />

      <div className={`w-px h-5 mx-0.5 ${lm ? "bg-gray-200" : "bg-white/[0.1]"}`} />

      <ColorPickerPopover icon={<Palette size={14} />} label="Text color" onSelect={c => exec("foreColor", c || "inherit")} lightMode={lm} />
      <ColorPickerPopover icon={<Highlighter size={14} />} label="Highlight" onSelect={c => exec("hiliteColor", c || "transparent")} lightMode={lm} />
      <ToolbarButton icon={<RemoveFormatting size={14} />} label="Clear formatting" onClick={() => exec("removeFormat")} lightMode={lm} />
    </ToolbarSegment>
  );
};

export default TypographyPanel;
