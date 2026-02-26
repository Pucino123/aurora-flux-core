import React, { useState, useRef } from "react";
import { Image, Link2, Code, Table2, ListChecks, Upload } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface InsertMenuProps {
  exec: (cmd: string, value?: string) => void;
  lightMode?: boolean;
}

/* Shared popup button style */
const popBtnCls = (lm: boolean) =>
  `w-full text-left px-3 py-2 text-[11px] rounded-lg transition-all duration-150 ${
    lm
      ? "hover:bg-gray-100 text-gray-700 active:bg-gray-200"
      : "hover:bg-white/[0.08] text-foreground/80 active:bg-white/[0.12]"
  }`;

const popInputCls = (lm: boolean) =>
  `w-full text-[11px] px-2.5 py-1.5 rounded-lg border outline-none transition-all duration-150 ${
    lm
      ? "border-gray-200 bg-white text-gray-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-gray-400"
      : "border-white/[0.12] bg-white/[0.06] text-foreground/90 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 placeholder:text-foreground/30"
  }`;

const InsertMenu = ({ exec, lightMode = false }: InsertMenuProps) => {
  const lm = lightMode;

  return (
    <>
      <LinkInsert exec={exec} lm={lm} />
      <ImageInsert exec={exec} lm={lm} />
      <TableInsert exec={exec} lm={lm} />
      <ToolbarButton icon={<Code size={14} />} label="Code block" onClick={() => exec("formatBlock", "pre")} lightMode={lm} />
      <ChecklistInsert exec={exec} lm={lm} />
    </>
  );
};

/* ─── Link Insert ─── */
const LinkInsert = ({ exec, lm }: { exec: (cmd: string, value?: string) => void; lm: boolean }) => {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const insert = () => {
    if (url.trim()) {
      exec("createLink", url.trim());
      setUrl("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div><ToolbarButton icon={<Link2 size={14} />} label="Insert link (⌘K)" onClick={() => setOpen(true)} lightMode={lm} /></div>
      </PopoverTrigger>
      <PopoverContent
        className={`w-64 p-3 z-[300] rounded-xl backdrop-blur-xl shadow-2xl border ${
          lm ? "bg-white/95 border-gray-200/60" : "bg-popover/95 border-white/[0.12]"
        }`}
        align="start" sideOffset={8}
      >
        <p className={`text-[10px] font-semibold mb-2 uppercase tracking-wider ${lm ? "text-gray-500" : "text-foreground/40"}`}>Insert Link</p>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && insert()}
          placeholder="https://example.com"
          className={popInputCls(lm)}
          autoFocus
        />
        <button
          onClick={insert}
          className={`w-full mt-2 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150 ${
            url.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : `cursor-not-allowed ${lm ? "bg-gray-100 text-gray-400" : "bg-white/[0.06] text-foreground/30"}`
          }`}
        >
          Insert
        </button>
      </PopoverContent>
    </Popover>
  );
};

/* ─── Image Insert ─── */
const ImageInsert = ({ exec, lm }: { exec: (cmd: string, value?: string) => void; lm: boolean }) => {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const insert = () => {
    if (url.trim()) {
      exec("insertImage", url.trim());
      setUrl("");
      setOpen(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      // Check session (not just getUser which can fail without network)
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        const { toast } = await import("sonner");
        toast.error("Please sign in to upload images");
        setUploading(false);
        return;
      }

      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("document-images").upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("document-images").getPublicUrl(path);
      exec("insertImage", urlData.publicUrl);
      setOpen(false);
    } catch (err) {
      console.error("Upload failed:", err);
      const { toast } = await import("sonner");
      toast.error("Upload fejlede");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div><ToolbarButton icon={<Image size={14} />} label="Insert image" onClick={() => setOpen(true)} lightMode={lm} /></div>
      </PopoverTrigger>
      <PopoverContent
        className={`w-64 p-3 z-[300] rounded-xl backdrop-blur-xl shadow-2xl border ${
          lm ? "bg-white/95 border-gray-200/60" : "bg-popover/95 border-white/[0.12]"
        }`}
        align="start" sideOffset={8}
      >
        <p className={`text-[10px] font-semibold mb-2 uppercase tracking-wider ${lm ? "text-gray-500" : "text-foreground/40"}`}>Insert Image</p>

        {/* File upload */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`w-full flex items-center justify-center gap-2 py-2 mb-2 text-[11px] font-medium rounded-lg border-2 border-dashed transition-all duration-150 ${
            uploading
              ? `${lm ? "border-gray-200 bg-gray-50 text-gray-400" : "border-white/[0.1] bg-white/[0.04] text-foreground/30"}`
              : `${lm ? "border-gray-300 hover:border-primary/50 hover:bg-primary/5 text-gray-600" : "border-white/[0.15] hover:border-primary/40 hover:bg-primary/5 text-foreground/60"}`
          }`}
        >
          <Upload size={14} />
          {uploading ? "Uploader..." : "Upload billede"}
        </button>

        <div className={`flex items-center gap-2 mb-2 ${lm ? "text-gray-400" : "text-foreground/30"}`}>
          <div className="flex-1 h-px bg-current" />
          <span className="text-[9px] uppercase tracking-wider">eller URL</span>
          <div className="flex-1 h-px bg-current" />
        </div>

        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && insert()}
          placeholder="https://example.com/image.png"
          className={popInputCls(lm)}
        />
        <button
          onClick={insert}
          className={`w-full mt-2 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-150 ${
            url.trim()
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : `cursor-not-allowed ${lm ? "bg-gray-100 text-gray-400" : "bg-white/[0.06] text-foreground/30"}`
          }`}
        >
          Insert
        </button>
      </PopoverContent>
    </Popover>
  );
};

/* ─── Table Insert ─── */
const TableInsert = ({ exec, lm }: { exec: (cmd: string, value?: string) => void; lm: boolean }) => {
  const [open, setOpen] = useState(false);
  const [hoverCell, setHoverCell] = useState<{ r: number; c: number } | null>(null);
  const maxR = 6;
  const maxC = 6;

  const insert = (rows: number, cols: number) => {
    const thead = `<tr>${Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join("")}</tr>`;
    const tbody = Array.from({ length: rows - 1 }, () => `<tr>${Array.from({ length: cols }, () => "<td>&nbsp;</td>").join("")}</tr>`).join("");
    exec("insertHTML", `<table>${thead}${tbody}</table>`);
    setOpen(false);
    setHoverCell(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div><ToolbarButton icon={<Table2 size={14} />} label="Insert table" onClick={() => setOpen(true)} lightMode={lm} /></div>
      </PopoverTrigger>
      <PopoverContent
        className={`w-auto p-3 z-[300] rounded-xl backdrop-blur-xl shadow-2xl border ${
          lm ? "bg-white/95 border-gray-200/60" : "bg-popover/95 border-white/[0.12]"
        }`}
        align="start" sideOffset={8}
      >
        <p className={`text-[10px] font-semibold mb-2 uppercase tracking-wider ${lm ? "text-gray-500" : "text-foreground/40"}`}>
          {hoverCell ? `${hoverCell.r + 1} × ${hoverCell.c + 1}` : "Select size"}
        </p>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${maxC}, 1fr)` }}>
          {Array.from({ length: maxR * maxC }, (_, idx) => {
            const r = Math.floor(idx / maxC);
            const c = idx % maxC;
            const active = hoverCell && r <= hoverCell.r && c <= hoverCell.c;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoverCell({ r, c })}
                onClick={() => insert(r + 1, c + 1)}
                className={`w-5 h-5 rounded-[4px] border cursor-pointer transition-all duration-100 ${
                  active
                    ? "bg-primary/30 border-primary/50 scale-105"
                    : lm
                      ? "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      : "border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ─── Checklist Insert ─── */
const ChecklistInsert = ({ exec, lm }: { exec: (cmd: string, value?: string) => void; lm: boolean }) => {
  const insert = () => {
    exec(
      "insertHTML",
      `<ul><li><span class="doc-checkbox" data-checked="false" contenteditable="false">☐</span> Task item</li></ul>`
    );
  };

  return <ToolbarButton icon={<ListChecks size={14} />} label="Insert checklist" onClick={insert} lightMode={lm} />;
};

export default InsertMenu;
