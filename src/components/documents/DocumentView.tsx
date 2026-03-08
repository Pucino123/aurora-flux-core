import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import { DbDocument } from "@/hooks/useDocuments";
import DocumentAiChat from "./DocumentAiChat";
import WordsToolbar from "./toolbar/WordsToolbar";
import SheetsToolbar from "./toolbar/SheetsToolbar";
import StatusBar from "./toolbar/StatusBar";
import StudioModeOverlay from "./toolbar/StudioModeToggle";
import { getCellDisplayValue, colIndexToLetter } from "@/lib/formulaEngine";
import LayoutCanvas, { CanvasEntity } from "./LayoutCanvas";

/** Safely sanitize HTML — strips scripts & inline handlers, keeps basic formatting + styles */
const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p","h1","h2","h3","h4","h5","h6","br","hr","b","strong","i","em","u","s","del",
      "span","div","ul","ol","li","blockquote","pre","code","table","thead","tbody","tr","th","td",
      "img","a","figure","figcaption","mark","sup","sub"],
    ALLOWED_ATTR: ["href","src","alt","class","style","id","data-checked","data-aura-stream","contenteditable"],
    FORBID_ATTR:  ["onerror","onload","onclick","onmouseover"],
  });

interface DocumentViewProps {
  document: DbDocument;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<DbDocument>) => void;
  onDelete: (id: string) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
  splitViewButton?: React.ReactNode;
}

const DocumentView = ({ document, onBack, onUpdate, onDelete, lightMode = false, onToggleLightMode, splitViewButton }: DocumentViewProps) => {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(document.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commitRename = () => {
    if (renameValue.trim() && renameValue.trim() !== document.title) {
      onUpdate(document.id, { title: renameValue.trim() });
    }
    setRenaming(false);
  };

  if (document.type === "spreadsheet") {
    return (
      <SpreadsheetEditor
        document={document} onUpdate={onUpdate} onDelete={onDelete}
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} lightMode={lightMode}
        onToggleLightMode={onToggleLightMode} splitViewButton={splitViewButton}
      />
    );
  }

  return (
    <TextEditor
      document={document} onUpdate={onUpdate} onDelete={onDelete}
      renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
      commitRename={commitRename} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} lightMode={lightMode}
      onToggleLightMode={onToggleLightMode} splitViewButton={splitViewButton}
    />
  );
};

/* ─── Shared editor props ─── */
interface EditorProps {
  document: DbDocument;
  onUpdate: (id: string, updates: Partial<DbDocument>) => void;
  onDelete: (id: string) => void;
  renaming: boolean;
  setRenaming: (v: boolean) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  commitRename: () => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  lightMode?: boolean;
  onToggleLightMode?: () => void;
  splitViewButton?: React.ReactNode;
}

/* ─── Text Editor ─── */
// ── Slash Command palette config ──
const SLASH_COMMANDS = [
  { icon: "H1", label: "Heading 1", desc: "Large section header", action: (exec: (c: string, v?: string) => void) => exec("formatBlock", "h1") },
  { icon: "H2", label: "Heading 2", desc: "Medium section header", action: (exec: (c: string, v?: string) => void) => exec("formatBlock", "h2") },
  { icon: "H3", label: "Heading 3", desc: "Small section header", action: (exec: (c: string, v?: string) => void) => exec("formatBlock", "h3") },
  { icon: "•", label: "Bullet List", desc: "Unordered list", action: (exec: (c: string, v?: string) => void) => exec("insertUnorderedList") },
  { icon: "1.", label: "Numbered List", desc: "Ordered numbered list", action: (exec: (c: string, v?: string) => void) => exec("insertOrderedList") },
  { icon: '❝', label: "Quote", desc: "Block quote for citations", action: (exec: (c: string, v?: string) => void) => exec("formatBlock", "blockquote") },
  { icon: "</>", label: "Code Block", desc: "Monospace code formatting", action: (exec: (c: string, v?: string) => void) => exec("formatBlock", "pre") },
  { icon: "—", label: "Divider", desc: "Horizontal rule separator", action: (exec: (c: string, v?: string) => void) => exec("insertHorizontalRule") },
  { icon: "✨", label: "Ask Aura", desc: "AI writes into your document", action: (_exec: (c: string, v?: string) => void, editorRef: React.RefObject<HTMLDivElement>) => {
    window.dispatchEvent(new CustomEvent("aura:open-panel"));
    editorRef.current?.blur();
  }},
];

const TextEditor = ({ document: doc, onUpdate, onDelete, renaming, setRenaming, renameValue, setRenameValue, commitRename, confirmDelete, setConfirmDelete, lightMode = false, onToggleLightMode, splitViewButton }: EditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [studioMode, setStudioMode] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Layout canvas mode: if doc.content has an entities array, show canvas instead of text editor
  const isCanvas = Array.isArray((doc.content as any)?.entities);
  const canvasEntities: CanvasEntity[] = (doc.content as any)?.entities || [];
  const handleCanvasChange = useCallback((entities: CanvasEntity[]) => {
    onUpdate(doc.id, { content: { ...(doc.content as any), entities } });
  }, [doc.id, doc.content, onUpdate]);
  const [ghostText, setGhostText] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamCancelRef = useRef<(() => void) | null>(null);
  const streamFinishRef = useRef<(() => void) | null>(null);
  const lm = lightMode;
  // Slash commands
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashPos, setSlashPos] = useState<{ top: number; left: number } | null>(null);
  const slashRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      let html = (doc.content as any)?.html || "";
      html = sanitize(processCheckboxes(html));
      editorRef.current.innerHTML = html;
      initialized.current = true;
      bindCheckboxes(editorRef.current);
    }
  }, [doc.content]);

  // Listen for Aura image insertion events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { url } = e.detail || {};
      if (!url || !editorRef.current) return;
      const img = `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0;" alt="Aura generated image" />`;
      editorRef.current.innerHTML += img;
      onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    };
    window.addEventListener("aura:insert-image" as any, handler);
    return () => window.removeEventListener("aura:insert-image" as any, handler);
  }, [doc.id, onUpdate]);

  // Listen for Aura write-to-document events (instant injection)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { html, append } = e.detail || {};
      if (!html || !editorRef.current) return;
      const safe = sanitize(html);
      if (append) {
        editorRef.current.innerHTML += safe;
      } else {
        editorRef.current.innerHTML = safe;
      }
      onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    };
    window.addEventListener("aura:write-to-document" as any, handler);
    return () => window.removeEventListener("aura:write-to-document" as any, handler);
  }, [doc.id, onUpdate]);

  // Listen for Aura live chunk streaming — use refs so closure captures stay valid across renders
  const streamElRef = useRef<HTMLElement | null>(null);
  const accumulatedRef = useRef("");
  const streamSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use stable refs for all streaming callbacks so re-renders never break the event listener
  const onUpdateRef = useRef(onUpdate);
  const docIdRef = useRef(doc.id);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
  useEffect(() => { docIdRef.current = doc.id; }, [doc.id]);

  useEffect(() => {
    const onStart = () => {
      if (!editorRef.current) return;
      accumulatedRef.current = "";
      // Remove any previous unfinished stream element
      const prev = editorRef.current.querySelector("[data-aura-stream]");
      if (prev) prev.remove();
      const p = window.document.createElement("p");
      p.setAttribute("data-aura-stream", "1");
      p.style.whiteSpace = "pre-wrap";
      editorRef.current.appendChild(p);
      streamElRef.current = p;
      setIsStreaming(true);
    };

    const onChunk = (e: CustomEvent) => {
      const { chunk } = e.detail || {};
      if (!chunk || !streamElRef.current) return;
      accumulatedRef.current += chunk;
      streamElRef.current.textContent = accumulatedRef.current + "▍";
      editorRef.current?.scrollTo({ top: editorRef.current.scrollHeight, behavior: "smooth" });
      if (streamSaveTimerRef.current) clearTimeout(streamSaveTimerRef.current);
      streamSaveTimerRef.current = setTimeout(() => {
        if (editorRef.current) onUpdateRef.current(docIdRef.current, { content: { html: editorRef.current.innerHTML } });
      }, 600);
    };

    const onDone = () => {
      if (streamSaveTimerRef.current) clearTimeout(streamSaveTimerRef.current);
      if (streamElRef.current) {
        streamElRef.current.textContent = accumulatedRef.current;
        streamElRef.current.removeAttribute("data-aura-stream");
        streamElRef.current = null;
      }
      if (editorRef.current) onUpdateRef.current(docIdRef.current, { content: { html: editorRef.current.innerHTML } });
      setIsStreaming(false);
      accumulatedRef.current = "";
      (window as any).__auraDocStreaming = false;
    };

    window.addEventListener("aura:stream-start" as any, onStart);
    window.addEventListener("aura:stream-chunk" as any, onChunk);
    window.addEventListener("aura:stream-done" as any, onDone);
    window.addEventListener("aura:stream-stop" as any, onDone);
    return () => {
      window.removeEventListener("aura:stream-start" as any, onStart);
      window.removeEventListener("aura:stream-chunk" as any, onChunk);
      window.removeEventListener("aura:stream-done" as any, onDone);
      window.removeEventListener("aura:stream-stop" as any, onDone);
      if (streamSaveTimerRef.current) clearTimeout(streamSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for Aura stream-to-document (typewriter word-by-word — legacy)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let finishNow = false;

    const handler = (e: CustomEvent) => {
      const { text, append } = e.detail || {};
      if (!text || !editorRef.current) return;

      cancelled = false;
      finishNow = false;
      setIsStreaming(true);

      const words = text.match(/\S+|\s+/g) || [];
      let wordIdx = 0;
      const baseHtml = append ? (editorRef.current.innerHTML || "") : "";
      const streamId = `aura-stream-${Date.now()}`;
      editorRef.current.innerHTML = baseHtml + `<p id="${streamId}" style="white-space:pre-wrap;"></p>`;
      let accumulated = "";
      const saveTimer = { current: null as ReturnType<typeof setTimeout> | null };

      const finish = () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        // Remove cursor blink span if present
        const el = editorRef.current?.querySelector(`#${streamId}`);
        if (el) el.textContent = accumulated;
        onUpdate(doc.id, { content: { html: editorRef.current!.innerHTML } });
        setIsStreaming(false);
        streamCancelRef.current = null;
        streamFinishRef.current = null;
      };

      streamCancelRef.current = () => {
        cancelled = true;
        clearTimeout(timeoutId);
        finish();
      };

      streamFinishRef.current = () => {
        finishNow = true;
        clearTimeout(timeoutId);
        // Dump all remaining words instantly
        accumulated = words.join("");
        finish();
      };

      const typeNextWord = () => {
        if (cancelled) return;
        if (finishNow) { accumulated = words.join(""); finish(); return; }
        if (wordIdx >= words.length) { finish(); return; }

        accumulated += words[wordIdx];
        wordIdx++;

        const el = editorRef.current?.querySelector(`#${streamId}`);
        if (el) el.textContent = accumulated + "▍";

        editorRef.current?.scrollTo({ top: editorRef.current.scrollHeight, behavior: "smooth" });

        if (wordIdx % 30 === 0) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            if (editorRef.current) onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
          }, 300);
        }

        const delay = 28 + Math.random() * 18;
        timeoutId = setTimeout(typeNextWord, delay);
      };

      typeNextWord();
    };

    window.addEventListener("aura:stream-to-document" as any, handler);
    return () => {
      window.removeEventListener("aura:stream-to-document" as any, handler);
      clearTimeout(timeoutId);
    };
  }, [doc.id, onUpdate]);



  // Ghost text: suggest meeting notes if doc is blank and matches a recent calendar event
  useEffect(() => {
    const isEmpty = !((doc.content as any)?.html?.replace(/<[^>]*>/g, "").trim());
    if (!isEmpty) return;

    // Try to find a matching calendar event from localStorage / flux context via custom event
    const stored = localStorage.getItem("flux_schedule_blocks");
    if (!stored) return;
    try {
      const blocks: any[] = JSON.parse(stored);
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      // Find a block that started within the last 90 minutes today
      const match = blocks.find((b: any) => {
        if (b.scheduled_date !== today) return false;
        const [h, m] = (b.time || "00:00").split(":").map(Number);
        const blockMinutes = h * 60 + m;
        return nowMinutes - blockMinutes >= 0 && nowMinutes - blockMinutes <= 90;
      });
      if (match) {
        const ghost = `📅 Meeting Notes — ${match.title}\nDate: ${new Date().toLocaleDateString()}\nAttendees: \n\nAgenda:\n• \n\nDiscussion:\n• \n\nAction Items:\n• \n\nNext Steps:\n• `;
        setGhostText(ghost);
      }
    } catch {}
  }, [doc.id, doc.content]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    }
  }, [doc.id, onUpdate]);

  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    window.document.execCommand(cmd, false, value);
    handleInput();
  }, [handleInput]);

  const acceptGhost = useCallback(() => {
    if (!ghostText || !editorRef.current) return;
    const html = ghostText.replace(/\n/g, "<br/>");
    editorRef.current.innerHTML = html;
    setGhostText(null);
    onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    const range = window.document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    editorRef.current.focus();
  }, [ghostText, doc.id, onUpdate]);

  const filteredSlashCmds = SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const closeSlash = useCallback(() => {
    setSlashOpen(false);
    setSlashQuery("");
    setSlashIndex(0);
    slashRangeRef.current = null;
  }, []);

  const applySlashCommand = useCallback((cmd: typeof SLASH_COMMANDS[0]) => {
    // Delete the slash + query text typed so far
    const sel = window.getSelection();
    if (sel && slashRangeRef.current) {
      sel.removeAllRanges();
      const r = slashRangeRef.current.cloneRange();
      // Extend range back by (1 + slashQuery.length) chars to cover "/query"
      r.setStart(r.endContainer, Math.max(0, (r.endOffset - 1 - slashQuery.length)));
      r.deleteContents();
      sel.addRange(r);
    }
    cmd.action(exec, editorRef);
    setTimeout(() => handleInput(), 50);
    closeSlash();
  }, [exec, slashQuery, closeSlash, handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Slash palette navigation
    if (slashOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredSlashCmds.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") { e.preventDefault(); if (filteredSlashCmds[slashIndex]) applySlashCommand(filteredSlashCmds[slashIndex]); return; }
      if (e.key === "Escape") { closeSlash(); return; }
      if (e.key === "Backspace" && slashQuery === "") { closeSlash(); return; }
      // Keep typing to filter
      return;
    }

    if (e.key === "Tab" && ghostText) { e.preventDefault(); acceptGhost(); return; }
    if (ghostText && !e.metaKey && !e.ctrlKey && e.key.length === 1) setGhostText(null);

    // Open slash palette on "/"
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();
        if (editorRect) {
          const top = rect.bottom - editorRect.top + 4;
          const left = Math.min(rect.left - editorRect.left, editorRect.width - 260);
          setSlashPos({ top, left });
          // Store range AFTER the "/" (we'll type it normally; detect on next keyup)
          const savedRange = range.cloneRange();
          savedRange.collapse(false);
          slashRangeRef.current = savedRange;
          setSlashOpen(true);
          setSlashQuery("");
          setSlashIndex(0);
        }
      }
      return; // let "/" be typed naturally
    }

    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    const shortcuts: Record<string, () => void> = {
      b: () => exec("bold"),
      i: () => exec("italic"),
      u: () => exec("underline"),
      z: () => e.shiftKey ? exec("redo") : exec("undo"),
      y: () => exec("redo"),
      k: () => { const url = prompt("Enter URL:"); if (url) exec("createLink", url); },
      d: () => exec("strikeThrough"),
      e: () => exec("formatBlock", "pre"),
      j: () => exec("justifyFull"),
      l: () => exec("justifyLeft"),
    };
    if (e.shiftKey && key === "7") { e.preventDefault(); exec("insertOrderedList"); return; }
    if (e.shiftKey && key === "8") { e.preventDefault(); exec("insertUnorderedList"); return; }
    if (e.shiftKey && key === "9") { e.preventDefault(); exec("formatBlock", "blockquote"); return; }
    if (e.altKey && ["1", "2", "3"].includes(key)) { e.preventDefault(); exec("formatBlock", `h${key}`); return; }
    if (shortcuts[key]) { e.preventDefault(); shortcuts[key](); }
  }, [exec, ghostText, acceptGhost, slashOpen, slashQuery, slashIndex, filteredSlashCmds, applySlashCommand, closeSlash]);

  // Update slash query as user types after "/"
  const handleInputWithSlash = useCallback(() => {
    if (editorRef.current) {
      onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    }
    if (slashOpen) {
      // Read what the user typed after the "/"
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && slashRangeRef.current) {
        const currentRange = sel.getRangeAt(0);
        try {
          const textNode = currentRange.startContainer;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent || "";
            const slashIdx = text.lastIndexOf("/");
            if (slashIdx !== -1) {
              const query = text.slice(slashIdx + 1);
              setSlashQuery(query);
              setSlashIndex(0);
            } else {
              closeSlash();
            }
          }
        } catch {
          closeSlash();
        }
      }
    }
  }, [doc.id, onUpdate, slashOpen, closeSlash]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("doc-checkbox")) {
      e.preventDefault();
      const isChecked = target.getAttribute("data-checked") === "true";
      target.setAttribute("data-checked", String(!isChecked));
      target.textContent = !isChecked ? "☑" : "☐";
      const li = target.closest("li");
      if (li) {
        li.style.opacity = !isChecked ? "0.5" : "1";
        li.style.textDecoration = !isChecked ? "line-through" : "none";
      }
      if (editorRef.current) onUpdate(doc.id, { content: { html: editorRef.current.innerHTML } });
    }
  }, [doc.id, onUpdate]);

  const wordCount = editorRef.current?.innerText?.trim().split(/\s+/).filter(Boolean).length || 0;
  const charCount = editorRef.current?.innerText?.length || 0;

  return (
    <div className={`flex flex-col h-full relative ${studioMode ? "z-[150] overflow-visible" : ""}`}>
      <StudioModeOverlay active={studioMode} onClose={() => setStudioMode(false)} />
      <WordsToolbar
        editorRef={editorRef as React.RefObject<HTMLDivElement>}
        onContentChange={handleInput}
        exec={exec}
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} documentTitle={doc.title} documentId={doc.id} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
        onDelete={() => onDelete(doc.id)}
        studioMode={studioMode} onToggleStudio={() => setStudioMode(!studioMode)}
        zoom={zoom} onZoomChange={setZoom}
        lightMode={lm}
        onToggleLightMode={onToggleLightMode}
        isStreaming={isStreaming}
        onStopStream={() => {
          // Hard stop — kill both legacy word-stream and new chunk-stream
          streamCancelRef.current?.();
          if ((window as any).__auraStreamStop) (window as any).__auraStreamStop();
          window.dispatchEvent(new CustomEvent("aura:stream-stop"));
        }}
        onFinishStream={() => {
          // Graceful finish — complete current sentence then stop
          streamFinishRef.current?.();
          if ((window as any).__auraStreamFinish) (window as any).__auraStreamFinish();
        }}
      />
      {splitViewButton && (
        <div className="flex justify-end px-3 py-1 border-b border-border/10">{splitViewButton}</div>
      )}
      {/* ── A4 scrollable canvas ── */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto"
        style={{
          background: lm ? "hsl(var(--muted))" : "hsl(220 27% 8%)",
          padding: studioMode ? "0" : "24px 24px 48px",
        }}
      >
        {/* Ghost text overlay sits on the page */}
        {ghostText && (
          <div
            className="absolute z-10 pointer-events-none text-sm leading-relaxed whitespace-pre-wrap font-mono select-none"
            style={{
              color: lm ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.18)",
              zoom: `${zoom}%`,
              top: 24 + 48, left: 24 + 48, right: 24 + 48,
            }}
          >
            {ghostText}
            <span
              className="ml-2 text-[10px] px-1.5 py-0.5 rounded border pointer-events-auto cursor-pointer"
              style={{ borderColor: "currentColor", opacity: 0.6 }}
              onClick={acceptGhost}
            >Tab to accept</span>
          </div>
        )}

        {/* A4 page container */}
        <div
          style={{
            width: "100%",
            maxWidth: "21cm",
            minHeight: "29.7cm",
            margin: "0 auto 32px",
            background: lm ? "#ffffff" : "hsl(var(--card))",
            boxShadow: lm
              ? "0 4px 32px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)"
              : "0 4px 32px rgba(0,0,0,0.5)",
            border: lm ? "1px solid hsl(var(--border))" : "1px solid hsl(var(--border)/0.15)",
            borderRadius: 4,
            overflow: isCanvas ? "hidden" : "visible",
            zoom: `${zoom}%`,
            position: "relative",
          }}
        >
        {/* ── Layout Canvas mode ── */}
        {isCanvas ? (
          <LayoutCanvas
            entities={canvasEntities}
            onChange={handleCanvasChange}
            lightMode={lm}
          />
        ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInputWithSlash}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { handleClick(e); editorRef.current?.focus(); }}
          onKeyDown={handleKeyDown}
          className={`outline-none text-sm leading-relaxed prose max-w-none px-12 py-12 bg-transparent min-h-[29.7cm]
            ${lm ? "prose-neutral text-gray-800" : "prose-invert text-foreground/90"}
            ${lm
              ? "[&_h1]:text-gray-900 [&_h2]:text-gray-800 [&_h3]:text-gray-700 [&_p]:text-gray-600 [&_li]:text-gray-600 [&_blockquote]:text-gray-500 [&_strong]:text-gray-900 [&_em]:text-gray-500"
              : "[&_h1]:text-foreground [&_h2]:text-foreground/90 [&_h3]:text-foreground/80 [&_p]:text-foreground/75 [&_li]:text-foreground/75 [&_blockquote]:text-foreground/60 [&_strong]:text-foreground [&_em]:text-foreground/60"
            }
            [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:border-b [&_h1]:pb-2
            ${lm ? "[&_h1]:border-gray-200" : "[&_h1]:border-border/15"}
            [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4
            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3
            [&_p]:mb-2
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-3 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-3 [&_ol]:space-y-1
            [&_li]:mb-0.5
            [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-3 [&_blockquote]:italic [&_blockquote]:rounded-r-lg [&_blockquote]:pr-3
            ${lm ? "[&_blockquote]:border-primary/40 [&_blockquote]:bg-primary/5" : "[&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5"}
            ${lm ? "[&_hr]:border-gray-200" : "[&_hr]:border-border/15"} [&_hr]:my-4
            [&_pre]:bg-secondary/20 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-3 [&_pre]:text-xs [&_pre]:font-mono [&_pre]:overflow-x-auto
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-xs
            ${lm
              ? "[&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-gray-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_th]:text-gray-700"
              : "[&_td]:border [&_td]:border-border/15 [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-border/15 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-secondary/30 [&_th]:font-semibold [&_th]:text-foreground/80"
            }
            [&_.doc-checkbox]:cursor-pointer [&_.doc-checkbox]:select-none [&_.doc-checkbox]:text-primary [&_.doc-checkbox]:mr-1.5 [&_.doc-checkbox]:text-base [&_.doc-checkbox]:transition-transform [&_.doc-checkbox]:duration-200 [&_.doc-checkbox]:hover:scale-125
            ${lm ? "selection:bg-primary/20" : "selection:bg-primary/20"}`}
          data-placeholder="Start typing..."
        />
        )}
        </div>
        {/* ── Slash Command Palette ── */}
        <AnimatePresence>
          {slashOpen && slashPos && filteredSlashCmds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute z-[200] w-60 rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
              style={{
                top: slashPos.top,
                left: Math.max(8, slashPos.left),
                background: lm ? "rgba(255,255,255,0.98)" : "rgba(20,18,32,0.98)",
                backdropFilter: "blur(20px)",
              }}
              onMouseDown={e => e.preventDefault()}
            >
              <div className="px-3 py-1.5 border-b border-border/30">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Insert block</p>
              </div>
              <div className="py-1 max-h-52 overflow-y-auto">
                {filteredSlashCmds.map((cmd, i) => (
                  <button
                    key={cmd.label}
                    onMouseDown={e => { e.preventDefault(); applySlashCommand(cmd); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      i === slashIndex
                        ? "bg-primary/15 text-primary"
                        : lm ? "hover:bg-gray-100 text-gray-800" : "hover:bg-white/5 text-foreground/80"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      i === slashIndex ? "bg-primary/20 text-primary" : "bg-secondary/60 text-muted-foreground"
                    }`}>
                      {cmd.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-tight">{cmd.label}</p>
                      <p className="text-[9px] text-muted-foreground/60 truncate">{cmd.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="px-3 py-1.5 border-t border-border/20">
                <p className="text-[8px] text-muted-foreground/40">↑↓ navigate · Enter to apply · Esc to dismiss</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <DocumentAiChat getDocumentContent={() => editorRef.current?.innerText || ""} editorRef={editorRef as React.RefObject<HTMLDivElement>} lightMode={lm} studioMode={studioMode} />
      <StatusBar wordCount={wordCount} charCount={charCount} lightMode={lm} />
    </div>
  );
};

function processCheckboxes(html: string): string {
  return html
    .replace(/\[x\]/gi, '<span class="doc-checkbox" data-checked="true" contenteditable="false">☑</span>')
    .replace(/\[ \]/g, '<span class="doc-checkbox" data-checked="false" contenteditable="false">☐</span>');
}

function bindCheckboxes(el: HTMLElement) {
  el.querySelectorAll(".doc-checkbox").forEach((cb) => {
    (cb as HTMLElement).style.cursor = "pointer";
    const isChecked = cb.getAttribute("data-checked") === "true";
    const li = cb.closest("li");
    if (li && isChecked) {
      li.style.opacity = "0.5";
      li.style.textDecoration = "line-through";
    }
  });
}

/* ─── Spreadsheet Editor ─── */
const SpreadsheetEditor = ({ document: doc, onUpdate, onDelete, renaming, setRenaming, renameValue, setRenameValue, commitRename, confirmDelete, setConfirmDelete, lightMode = false, onToggleLightMode, splitViewButton }: EditorProps) => {
  const lm = lightMode;
  const [studioMode, setStudioMode] = useState(false);

  const getRows = (): string[][] => {
    if ((doc.content as any)?.rows && Array.isArray((doc.content as any).rows)) return (doc.content as any).rows;
    return Array.from({ length: 10 }, () => Array(5).fill(""));
  };

  const [rows, setRows] = useState<string[][]>(getRows);
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);
  const lastFocusedCell = useRef<{ r: number; c: number } | null>(null);
  const colCount = rows[0]?.length || 5;
  const [cellFormats, setCellFormats] = useState<Record<string, any>>(() => (doc.content as any)?.cellFormats || {});

  const [colHeaders, setColHeaders] = useState<string[]>(() => {
    if ((doc.content as any)?.colHeaders) return (doc.content as any).colHeaders;
    return Array.from({ length: colCount }, (_, i) => String.fromCharCode(65 + i));
  });
  const [rowHeaders, setRowHeaders] = useState<string[]>(() => {
    if ((doc.content as any)?.rowHeaders) return (doc.content as any).rowHeaders;
    return Array.from({ length: rows.length }, (_, i) => String(i + 1));
  });

  const [colWidths, setColWidths] = useState<number[]>(() => Array(colCount).fill(120));
  const [rowHeights, setRowHeights] = useState<number[]>(() => Array(rows.length).fill(32));
  const resizingCol = useRef<{ idx: number; startX: number; startW: number } | null>(null);
  const resizingRow = useRef<{ idx: number; startY: number; startH: number } | null>(null);
  const [cellMenu, setCellMenu] = useState<{ x: number; y: number; r: number; c: number } | null>(null);

  React.useEffect(() => {
    const close = () => setCellMenu(null);
    if (cellMenu) { window.addEventListener("click", close); return () => window.removeEventListener("click", close); }
  }, [cellMenu]);

  useEffect(() => {
    setColWidths(prev => {
      const c = rows[0]?.length || 5;
      if (prev.length === c) return prev;
      const next = Array(c).fill(120);
      prev.forEach((w, i) => { if (i < c) next[i] = w; });
      return next;
    });
    setRowHeights(prev => {
      if (prev.length === rows.length) return prev;
      const next = Array(rows.length).fill(32);
      prev.forEach((h, i) => { if (i < rows.length) next[i] = h; });
      return next;
    });
  }, [rows.length, rows[0]?.length]);

  const saveContent = useCallback((newRows: string[][], newFormats?: Record<string, any>, newColH?: string[], newRowH?: string[]) => {
    const fmts = newFormats ?? cellFormats;
    const ch = newColH ?? colHeaders;
    const rh = newRowH ?? rowHeaders;
    onUpdate(doc.id, { content: { rows: newRows, cellFormats: fmts, colHeaders: ch, rowHeaders: rh } });
  }, [doc.id, onUpdate, cellFormats, colHeaders, rowHeaders]);

  // Listen for Aura formula injection events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { cell, formula } = e.detail || {};
      if (!cell || !formula) return;
      // Parse cell ref e.g. "B3" → col=1, row=2
      const match = cell.match(/^([A-Z]+)(\d+)$/i);
      if (!match) return;
      let col = 0;
      for (let i = 0; i < match[1].length; i++) col = col * 26 + (match[1].toUpperCase().charCodeAt(i) - 64);
      col -= 1; // 0-indexed
      const row = parseInt(match[2], 10) - 1; // 0-indexed
      setRows(prev => {
        const updated = prev.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? formula : c) : r);
        saveContent(updated);
        return updated;
      });
    };
    window.addEventListener("aura:inject-formula" as any, handler);
    return () => window.removeEventListener("aura:inject-formula" as any, handler);
  }, [saveContent]);

  const resolveCell = useCallback((col: number, row: number): number => {
    const val = rows[row]?.[col];
    if (!val) return 0;
    if (val.startsWith("=")) {
      const result = getCellDisplayValue(val, resolveCell);
      const n = parseFloat(result);
      return isNaN(n) ? 0 : n;
    }
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }, [rows]);

  const updateCell = (r: number, c: number, val: string) => {
    const updated = rows.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? val : cell) : row);
    setRows(updated);
    saveContent(updated);
  };

  const focusCellInput = (r: number, c: number) => {
    const tbody = window.document.querySelector("[data-sheet-tbody]");
    if (!tbody) return;
    const row = tbody.querySelectorAll("tr")[r];
    if (!row) return;
    // +1 because first td is row number
    const inputs = row.querySelectorAll("td input");
    (inputs?.[c] as HTMLInputElement)?.focus();
  };

  const addRow = () => { const nr = [...rows, Array(colCount).fill("")]; setRows(nr); saveContent(nr); };
  const addColumn = () => { const nr = rows.map(r => [...r, ""]); setRows(nr); saveContent(nr); };
  const deleteRow = (r: number) => { if (rows.length <= 1) return; const nr = rows.filter((_, i) => i !== r); setRows(nr); saveContent(nr); };
  const deleteColumn = (c: number) => { if (colCount <= 1) return; const nr = rows.map(r => r.filter((_, i) => i !== c)); setRows(nr); saveContent(nr); };
  const insertRowAfter = (r: number) => { const nr = [...rows.slice(0, r + 1), Array(colCount).fill(""), ...rows.slice(r + 1)]; setRows(nr); saveContent(nr); };
  const insertColAfter = (c: number) => { const nr = rows.map(r => [...r.slice(0, c + 1), "", ...r.slice(c + 1)]); setRows(nr); saveContent(nr); };

  const getCellKey = () => {
    const cell = focusedCell || lastFocusedCell.current;
    return cell ? `${cell.r}-${cell.c}` : null;
  };
  const getCellFormat = (key: string) => cellFormats[key] || {};
  const updateCellFormat = (updates: Record<string, any>) => {
    const key = getCellKey();
    if (!key) return;
    const newFormats = { ...cellFormats, [key]: { ...getCellFormat(key), ...updates } };
    setCellFormats(newFormats);
    saveContent(rows, newFormats);
  };

  const exportCsv = () => {
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = window.document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.title}.csv`;
    a.click();
  };

  const onColResizeStart = (e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    resizingCol.current = { idx, startX: e.clientX, startW: colWidths[idx] };
    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      const d = ev.clientX - resizingCol.current.startX;
      setColWidths(p => p.map((w, i) => i === resizingCol.current!.idx ? Math.max(60, resizingCol.current!.startW + d) : w));
    };
    const onUp = () => { resizingCol.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  const onRowResizeStart = (e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    resizingRow.current = { idx, startY: e.clientY, startH: rowHeights[idx] };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRow.current) return;
      const d = ev.clientY - resizingRow.current.startY;
      setRowHeights(p => p.map((h, i) => i === resizingRow.current!.idx ? Math.max(24, resizingRow.current!.startH + d) : h));
    };
    const onUp = () => { resizingRow.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  const headerBg = lm ? "bg-[#f8f9fa]" : "bg-secondary/40";
  const headerText = lm ? "text-[#5f6368]" : "text-muted-foreground/70";
  const cellBorder = lm ? "border-[#e0e0e0]" : "border-border/50";
  const rowNumText = lm ? "text-gray-500" : "text-muted-foreground/60";
  const headerRowBg = lm ? "bg-gray-50" : "bg-secondary/30";
  const resizeHandleCol = lm ? "hover:bg-blue-400/20 bg-transparent" : "hover:bg-primary/20 bg-transparent";
  const resizeHandleRow = lm ? "hover:bg-blue-400/20 bg-transparent" : "hover:bg-primary/20 bg-transparent";
  const ctxBg = lm ? "bg-white/95" : "bg-card/95";
  const ctxBorder = lm ? "border-gray-200/60" : "border-border/40";
  const ctxHover = lm ? "hover:bg-gray-100" : "hover:bg-secondary/50";

  return (
    <div className={`flex flex-col h-full relative ${studioMode ? "z-[150] overflow-visible" : ""}`}>
      <StudioModeOverlay active={studioMode} onClose={() => setStudioMode(false)} />
      <SheetsToolbar
        onBoldToggle={() => updateCellFormat({ bold: !getCellFormat(getCellKey() || "").bold })}
        onItalicToggle={() => updateCellFormat({ italic: !getCellFormat(getCellKey() || "").italic })}
        onUnderlineToggle={() => updateCellFormat({ underline: !getCellFormat(getCellKey() || "").underline })}
        onStrikethroughToggle={() => updateCellFormat({ strikethrough: !getCellFormat(getCellKey() || "").strikethrough })}
        onTextColor={c => updateCellFormat({ color: c || undefined })}
        onBgColor={c => updateCellFormat({ bg: c || undefined })}
        onTextAlign={a => updateCellFormat({ align: a })}
        onFontSize={s => updateCellFormat({ fontSize: s })}
        renaming={renaming} setRenaming={setRenaming} renameValue={renameValue} setRenameValue={setRenameValue}
        commitRename={commitRename} documentTitle={doc.title} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
        onDelete={() => onDelete(doc.id)}
        studioMode={studioMode} onToggleStudio={() => setStudioMode(!studioMode)}
        onExportCsv={exportCsv}
        onInsertText={(text) => {
          const cell = focusedCell || lastFocusedCell.current;
          if (cell) {
            const val = rows[cell.r][cell.c] + text;
            updateCell(cell.r, cell.c, val);
          }
        }}
      lightMode={lm}
        onToggleLightMode={onToggleLightMode}
      />
      {splitViewButton && (
        <div className="flex justify-end px-3 py-1 border-b border-border/10">{splitViewButton}</div>
      )}
      {/* Formula / Address Bar */}
      {(focusedCell || lastFocusedCell.current) && (() => {
        const cell = focusedCell || lastFocusedCell.current;
        if (!cell) return null;
        const addr = `${colIndexToLetter(cell.c)}${cell.r + 1}`;
        const rawVal = rows[cell.r]?.[cell.c] || "";
        return (
          <div className={`flex items-center gap-2 px-3 py-1 border-b text-xs ${lm ? "border-gray-200 bg-gray-50" : "border-border/30 bg-secondary/20"}`}>
            <span className={`font-mono font-semibold min-w-[40px] ${lm ? "text-gray-600" : "text-foreground/70"}`}>{addr}</span>
            <div className={`w-px h-4 ${lm ? "bg-gray-300" : "bg-border/30"}`} />
            <span className={`font-mono flex-1 truncate ${lm ? "text-gray-700" : "text-foreground/80"}`}>
              {rawVal.startsWith("=") ? rawVal : rawVal}
            </span>
            {rawVal.startsWith("=") && (
              <span className={`font-mono ${lm ? "text-green-600" : "text-green-400"}`}>
                = {getCellDisplayValue(rawVal, resolveCell)}
              </span>
            )}
          </div>
        );
      })()}
      <div className={`flex-1 overflow-auto rounded-xl border ${cellBorder} ${studioMode ? (lm ? "bg-white shadow-xl" : "bg-card/80 shadow-xl") : ""}`}>
        <table className="border-collapse text-xs" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 36 }} />
            {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className={`w-9 ${headerBg} border-b border-r ${cellBorder}`} />
              {colHeaders.map((label, ci) => (
                <th key={ci} className={`relative ${headerBg} border-b border-r ${cellBorder} text-[10px] ${headerText} font-mono py-0 select-none font-semibold`}>
                  <input
                    value={label}
                    onChange={e => {
                      const next = [...colHeaders];
                      next[ci] = e.target.value;
                      setColHeaders(next);
                      saveContent(rows, undefined, next, undefined);
                    }}
                    className={`w-full bg-transparent text-center text-[10px] font-mono font-semibold outline-none py-1.5 ${headerText}`}
                  />
                  <div className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize ${resizeHandleCol} transition-colors z-10`} onMouseDown={e => onColResizeStart(e, ci)} title="Drag to resize column">
                    <div className={`absolute right-0 top-1 bottom-1 w-[2px] rounded-full ${lm ? "bg-gray-300/50" : "bg-muted-foreground/15"}`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody data-sheet-tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri === 0 ? headerRowBg : `${lm ? "hover:bg-gray-50" : "hover:bg-secondary/10"} transition-colors`}>
                <td className={`relative text-center text-[10px] ${rowNumText} border-r border-b ${cellBorder} select-none font-mono font-medium p-0`}
                  style={{ height: rowHeights[ri] }}
                  onContextMenu={e => { e.preventDefault(); setCellMenu({ x: e.clientX, y: e.clientY, r: ri, c: -1 }); }}>
                  <input
                    value={rowHeaders[ri] ?? String(ri + 1)}
                    onChange={e => {
                      const next = [...rowHeaders];
                      next[ri] = e.target.value;
                      setRowHeaders(next);
                      saveContent(rows, undefined, undefined, next);
                    }}
                    className={`w-full bg-transparent text-center text-[10px] font-mono font-medium outline-none ${rowNumText}`}
                    style={{ height: rowHeights[ri] }}
                  />
                  <div className={`absolute left-0 right-0 bottom-0 h-2 cursor-row-resize ${resizeHandleRow} transition-colors z-10`} onMouseDown={e => onRowResizeStart(e, ri)} title="Drag to resize row">
                    <div className={`absolute left-1 right-1 bottom-0 h-[2px] rounded-full ${lm ? "bg-gray-300/50" : "bg-muted-foreground/15"}`} />
                  </div>
                </td>
                {row.map((cell, ci) => {
                  const isFocused = focusedCell?.r === ri && focusedCell?.c === ci;
                  const fmt = getCellFormat(`${ri}-${ci}`);
                  return (
                    <td key={ci}
                      className={`border ${cellBorder} p-0 transition-all duration-150 ${isFocused ? `ring-2 ring-primary/40 ring-inset ${lm ? "bg-blue-50" : "bg-primary/5"}` : ""}`}
                      style={{ backgroundColor: fmt.bg || undefined }}
                      onContextMenu={e => { e.preventDefault(); setCellMenu({ x: e.clientX, y: e.clientY, r: ri, c: ci }); }}>
                      <input value={cell.startsWith("=") ? (isFocused ? cell : getCellDisplayValue(cell, resolveCell)) : cell}
                        onChange={e => updateCell(ri, ci, e.target.value)}
                        onFocus={() => { setFocusedCell({ r: ri, c: ci }); lastFocusedCell.current = { r: ri, c: ci }; }}
                        onBlur={() => setFocusedCell(null)}
                        onKeyDown={e => {
                          if (e.key === "Tab") {
                            e.preventDefault();
                            const nextC = e.shiftKey ? ci - 1 : ci + 1;
                            if (nextC >= 0 && nextC < colCount) {
                              focusCellInput(ri, nextC);
                            } else if (!e.shiftKey && ri + 1 < rows.length) {
                              focusCellInput(ri + 1, 0);
                            }
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (ri + 1 < rows.length) focusCellInput(ri + 1, ci);
                          }
                          // Arrow key navigation
                          if (e.key === "ArrowDown") { e.preventDefault(); if (ri + 1 < rows.length) focusCellInput(ri + 1, ci); }
                          if (e.key === "ArrowUp") { e.preventDefault(); if (ri > 0) focusCellInput(ri - 1, ci); }
                          if (e.key === "ArrowRight" && (e.target as HTMLInputElement).selectionStart === cell.length) {
                            if (ci + 1 < colCount) { e.preventDefault(); focusCellInput(ri, ci + 1); }
                          }
                          if (e.key === "ArrowLeft" && (e.target as HTMLInputElement).selectionStart === 0) {
                            if (ci > 0) { e.preventDefault(); focusCellInput(ri, ci - 1); }
                          }
                          const mod = e.metaKey || e.ctrlKey;
                          if (mod && e.key === "b") { e.preventDefault(); updateCellFormat({ bold: !getCellFormat(`${ri}-${ci}`).bold }); }
                          if (mod && e.key === "i") { e.preventDefault(); updateCellFormat({ italic: !getCellFormat(`${ri}-${ci}`).italic }); }
                          if (mod && e.key === "u") { e.preventDefault(); updateCellFormat({ underline: !getCellFormat(`${ri}-${ci}`).underline }); }
                        }}
                        className={`w-full bg-transparent outline-none px-2.5 ${ri === 0 ? `font-semibold ${lm ? "text-gray-900" : "text-foreground/90"}` : ""} transition-colors`}
                        style={{
                          height: rowHeights[ri],
                          fontWeight: fmt.bold ? "bold" : undefined,
                          fontStyle: fmt.italic ? "italic" : undefined,
                          textDecoration: [fmt.underline && "underline", fmt.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined,
                          color: fmt.color || undefined,
                          textAlign: fmt.align || undefined,
                          fontSize: fmt.fontSize ? `${fmt.fontSize}px` : undefined,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 p-2">
          <button onClick={addRow} className={`text-[10px] px-2.5 py-1 rounded-lg transition-all duration-200 ${lm ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100" : "text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/30"}`}>+ Row</button>
          <button onClick={addColumn} className={`text-[10px] px-2.5 py-1 rounded-lg transition-all duration-200 ${lm ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100" : "text-muted-foreground/50 hover:text-foreground/70 hover:bg-secondary/30"}`}>+ Column</button>
        </div>
      </div>

      <DocumentAiChat getDocumentContent={() => rows.map(r => r.join("\t")).join("\n")} lightMode={lm} studioMode={studioMode} />

      {cellMenu && (
        <div className={`fixed z-[300] min-w-[160px] py-1.5 rounded-xl ${ctxBg} backdrop-blur-xl border ${ctxBorder} shadow-2xl shadow-black/30 animate-scale-in`}
          style={{ top: cellMenu.y, left: cellMenu.x }} onClick={() => setCellMenu(null)}>
          <button onClick={() => insertRowAfter(cellMenu.r)} className={`w-full text-left px-3.5 py-1.5 text-[12px] ${lm ? "text-gray-800" : "text-foreground"} ${ctxHover} transition-colors`}>Insert row below</button>
          {cellMenu.c >= 0 && (
            <button onClick={() => insertColAfter(cellMenu.c)} className={`w-full text-left px-3.5 py-1.5 text-[12px] ${lm ? "text-gray-800" : "text-foreground"} ${ctxHover} transition-colors`}>Insert column right</button>
          )}
          <div className={`h-px ${lm ? "bg-gray-200" : "bg-border/20"} mx-2.5 my-1`} />
          <button onClick={() => deleteRow(cellMenu.r)} className={`w-full text-left px-3.5 py-1.5 text-[12px] text-destructive ${lm ? "hover:bg-red-50" : "hover:bg-destructive/10"} transition-colors`}>Delete row</button>
          {cellMenu.c >= 0 && (
            <button onClick={() => deleteColumn(cellMenu.c)} className={`w-full text-left px-3.5 py-1.5 text-[12px] text-destructive ${lm ? "hover:bg-red-50" : "hover:bg-destructive/10"} transition-colors`}>Delete column</button>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentView;
