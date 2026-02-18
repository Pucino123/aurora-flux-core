import React from "react";
import { Image, Link2, Code, Table2, Smile } from "lucide-react";
import ToolbarSegment from "./ToolbarSegment";
import ToolbarButton from "./ToolbarButton";

interface InsertMenuProps {
  exec: (cmd: string, value?: string) => void;
  lightMode?: boolean;
}

const InsertMenu = ({ exec, lightMode = false }: InsertMenuProps) => {
  const lm = lightMode;

  return (
    <ToolbarSegment>
      <ToolbarButton icon={<Link2 size={14} />} label="Insert link (⌘K)" onClick={() => { const url = prompt("Enter URL:"); if (url) exec("createLink", url); }} lightMode={lm} />
      <ToolbarButton icon={<Image size={14} />} label="Insert image" onClick={() => { const url = prompt("Enter image URL:"); if (url) exec("insertImage", url); }} lightMode={lm} />
      <ToolbarButton
        icon={<Table2 size={14} />}
        label="Insert table"
        onClick={() => {
          const cols = parseInt(prompt("Columns (2-10):", "3") || "0");
          const rws = parseInt(prompt("Rows (2-20):", "3") || "0");
          if (cols > 0 && rws > 0) {
            const thead = `<tr>${Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join("")}</tr>`;
            const tbody = Array.from({ length: rws - 1 }, () => `<tr>${Array.from({ length: cols }, () => "<td></td>").join("")}</tr>`).join("");
            exec("insertHTML", `<table>${thead}${tbody}</table>`);
          }
        }}
        lightMode={lm}
      />
      <ToolbarButton icon={<Code size={14} />} label="Code block" onClick={() => exec("formatBlock", "pre")} lightMode={lm} />
      <ToolbarButton
        icon={<Smile size={14} />}
        label="Insert emoji"
        onClick={() => {
          const emojis = ["😀", "🎯", "🚀", "💡", "✅", "❌", "⭐", "🔥", "📌", "💎", "🎉", "📝"];
          const choice = prompt(`Pick emoji:\n${emojis.join(" ")}\n\nOr type your own:`);
          if (choice) exec("insertHTML", choice);
        }}
        lightMode={lm}
      />
    </ToolbarSegment>
  );
};

export default InsertMenu;
