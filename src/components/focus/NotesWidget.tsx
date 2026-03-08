import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Search, Plus, Bold, Italic, Underline, Trash2, Eye, EyeOff, X, Loader2, Cloud, CloudOff } from "lucide-react";
import DraggableWidget from "./DraggableWidget";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Note {
  id: string;
  title: string;
  content: string; // stores innerHTML for rich text
  isLocked: boolean;
  password?: string;
  updatedAt: string;
  synced?: boolean;
}

// ── DB encoding helpers ──
const encodeTags = (isLocked: boolean, password?: string): string[] => {
  if (!isLocked) return [];
  return password ? ["locked", `pw:${password}`] : ["locked"];
};

const decodeNote = (row: {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  updated_at: string;
}): Note => {
  const tags = row.tags || [];
  const isLocked = tags.includes("locked");
  const pwTag = tags.find(t => t.startsWith("pw:"));
  const password = pwTag ? pwTag.slice(3) : undefined;
  return {
    id: row.id,
    title: row.title || "Untitled",
    content: row.content || "",
    isLocked,
    password,
    updatedAt: row.updated_at,
    synced: true,
  };
};

const FALLBACK_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Project Brainstorm",
    content: "<p><b>Project Brainstorm</b></p><p><br></p><p>Ideas for Q2 launch:</p><p>• Revamp onboarding flow</p><p>• Add AI-powered suggestions</p><p>• Mobile-first redesign</p><p><br></p><p>Key metrics to watch: <b>retention</b>, DAU, <i>conversion</i>.</p>",
    isLocked: false,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "note-2",
    title: "Personal Goals",
    content: "<p>Personal Goals</p><p><br></p><p>My private notes...</p>",
    isLocked: true,
    password: "1234",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "note-3",
    title: "Meeting Notes — April",
    content: "<p><b>Meeting Notes — April</b></p><p><br></p><p>Attendees: <i>Sarah, John, Marcus</i></p><p>Agenda:</p><p>1. Q1 review</p><p>2. Budget allocation</p><p>3. Hiring plans</p><p><br></p><p>Decisions: Approved <b>2 new hires</b> in engineering.</p>",
    isLocked: false,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "note-4",
    title: "Reading List",
    content: "<p><b>Reading List</b></p><p><br></p><p>• Atomic Habits — James Clear ✓</p><p>• <i>Deep Work</i> — Cal Newport</p><p>• The Lean Startup — Eric Ries</p><p>• Zero to One — Peter Thiel</p>",
    isLocked: false,
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const formatRelativeTime = (isoString: string) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getPreview = (note: Note, unlocked: boolean) => {
  if (note.isLocked && !unlocked) return "🔒 Locked Note";
  // Strip HTML for preview
  const plain = note.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const lines = plain.split(/[.\n]/).filter(l => l.trim());
  return lines.slice(1, 3).join(" ") || "No additional text";
};


// ── Note Editor ──

const NoteContent: React.FC<{
  notes: Note[];
  selectedId: string;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onLockToggle: (id: string) => void;
  unlockedIds: Set<string>;
  onUnlock: (id: string) => void;
}> = ({ notes, selectedId, onUpdate, onLockToggle, unlockedIds, onUnlock }) => {
  const note = notes.find(n => n.id === selectedId);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const lastHtml = useRef("");

  const isEffectivelyUnlocked = !note?.isLocked || unlockedIds.has(selectedId);

  // Sync editor content when switching notes
  useEffect(() => {
    if (editorRef.current && note && isEffectivelyUnlocked) {
      if (editorRef.current.innerHTML !== note.content) {
        editorRef.current.innerHTML = note.content;
        lastHtml.current = note.content;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isEffectivelyUnlocked]);

  const handleUnlock = () => {
    if (!note) return;
    if (pwInput === (note.password || "1234")) {
      onUnlock(selectedId);
      setPwInput("");
      setPwError(false);
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 1500);
    }
  };

  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposing.current) return;
    const html = editorRef.current.innerHTML;
    if (html === lastHtml.current) return;
    lastHtml.current = html;
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const title = plain.split(/[.\n]/)[0]?.slice(0, 60)?.trim() || "Untitled";
    onUpdate(selectedId, {
      content: html,
      title,
      updatedAt: new Date().toISOString(),
    });
  }, [selectedId, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType !== Node.TEXT_NODE) return;
      const text = node.textContent || "";
      const offset = range.startOffset;
      const before = text.slice(0, offset);

      const boldMatch = before.match(/\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        e.preventDefault();
        const match = boldMatch[0];
        const word = boldMatch[1];
        node.textContent = text.slice(0, offset - match.length) + text.slice(offset);
        document.execCommand("insertHTML", false, `<b>${word}</b>${e.key === " " ? "&nbsp;" : "<br>"}`);
        setTimeout(handleInput, 0);
        return;
      }

      const italicMatch = before.match(/(?<!\*)\*([^*]+)\*$/);
      if (italicMatch) {
        e.preventDefault();
        const match = italicMatch[0];
        const word = italicMatch[1];
        node.textContent = text.slice(0, offset - match.length) + text.slice(offset);
        document.execCommand("insertHTML", false, `<em>${word}</em>${e.key === " " ? "&nbsp;" : "<br>"}`);
        setTimeout(handleInput, 0);
        return;
      }

      const ulMatch = before.match(/_([^_]+)_$/);
      if (ulMatch) {
        e.preventDefault();
        const match = ulMatch[0];
        const word = ulMatch[1];
        node.textContent = text.slice(0, offset - match.length) + text.slice(offset);
        document.execCommand("insertHTML", false, `<u>${word}</u>${e.key === " " ? "&nbsp;" : "<br>"}`);
        setTimeout(handleInput, 0);
        return;
      }
    }
  }, [handleInput]);

  const execFormat = (cmd: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
    setTimeout(handleInput, 0);
  };

  if (!note) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-white/20 text-sm">Select a note</p>
    </div>
  );

  if (note.isLocked && !isEffectivelyUnlocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"
        >
          <Lock size={24} className="text-white/40" />
        </motion.div>
        <div className="text-center">
          <p className="text-white/60 text-sm font-medium mb-1">This note is locked</p>
          <p className="text-white/25 text-xs">Enter password to view</p>
        </div>
        <div className="w-full max-w-[200px] space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${pwError ? "border-red-400/50 bg-red-400/5" : "border-white/10 bg-white/5"}`}>
            <input
              type={showPw ? "text" : "password"}
              value={pwInput}
              onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleUnlock()}
              placeholder="Password..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20"
              autoFocus
            />
            <button onClick={() => setShowPw(!showPw)} className="text-white/30 hover:text-white/60">
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          {pwError && <p className="text-red-400 text-[10px] text-center">Incorrect password</p>}
          <button onClick={handleUnlock} className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/8 shrink-0">
        {[
          { icon: Bold, label: "Bold", cmd: "bold" },
          { icon: Italic, label: "Italic", cmd: "italic" },
          { icon: Underline, label: "Underline", cmd: "underline" },
        ].map(({ icon: Icon, label, cmd }) => (
          <button
            key={label}
            title={label}
            onMouseDown={e => { e.preventDefault(); execFormat(cmd); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            <Icon size={12} />
          </button>
        ))}
        <div className="w-px h-4 bg-white/10 mx-1" />
        <span className="text-[9px] text-white/20 italic">**bold** *italic* _underline_</span>
        <div className="flex-1" />
        <button
          onClick={() => onLockToggle(selectedId)}
          title={note.isLocked ? "Unlock Note" : "Lock Note"}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${note.isLocked ? "text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/10" : "text-white/30 hover:text-white/60 hover:bg-white/8"}`}
        >
          {note.isLocked ? <><Unlock size={11} /> Unlock</> : <><Lock size={11} /> Lock</>}
        </button>
      </div>
      {/* Rich Text Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        className="flex-1 w-full bg-transparent text-white/80 text-[13px] leading-relaxed outline-none px-4 py-3 overflow-y-auto council-hidden-scrollbar notes-editor"
        data-placeholder="Start writing…"
        style={{ fontFamily: "inherit", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      />
    </div>
  );
};

// ── Main Notes Widget ──

const NotesWidgetContent = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>(FALLBACK_NOTES);
  const [selectedId, setSelectedId] = useState<string>(FALLBACK_NOTES[0].id);
  const [search, setSearch] = useState("");
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Load notes from DB ──
  useEffect(() => {
    if (!user) {
      setNotes(FALLBACK_NOTES);
      setSelectedId(FALLBACK_NOTES[0].id);
      return;
    }
    setLoading(true);
    supabase
      .from("tasks")
      .select("id, title, content, tags, updated_at")
      .eq("user_id", user.id)
      .eq("type", "note")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error || !data || data.length === 0) {
          setNotes(FALLBACK_NOTES);
          setSelectedId(FALLBACK_NOTES[0].id);
          return;
        }
        const loaded = data.map(decodeNote);
        setNotes(loaded);
        setSelectedId(loaded[0].id);
      });
  }, [user]);

  // ── Real-time subscription ──
  useEffect(() => {
    if (!user) return;
    channelRef.current = supabase
      .channel(`notes-rt-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if ((payload.new as { type?: string })?.type !== "note" && (payload.old as { type?: string })?.type !== "note") return;
        if (payload.eventType === "DELETE") {
          const oldId = (payload.old as { id: string }).id;
          setNotes(prev => prev.filter(n => n.id !== oldId));
        } else if (payload.eventType === "INSERT") {
          const row = payload.new as { id: string; title: string; content: string | null; tags: string[] | null; updated_at: string };
          if (row.id) {
            const note = decodeNote(row);
            setNotes(prev => {
              if (prev.find(n => n.id === note.id)) return prev;
              return [note, ...prev];
            });
          }
        } else if (payload.eventType === "UPDATE") {
          const row = payload.new as { id: string; title: string; content: string | null; tags: string[] | null; updated_at: string };
          if (row.id) {
            const updated = decodeNote(row);
            setNotes(prev => prev.map(n => n.id === updated.id ? { ...updated, synced: true } : n));
          }
        }
      })
      .subscribe();
    return () => { channelRef.current?.unsubscribe(); };
  }, [user]);

  // ── Debounced save to DB ──
  const saveNote = useCallback(async (note: Note) => {
    if (!user) return;
    setSyncing(true);
    try {
      await supabase.from("tasks").upsert({
        id: note.id.startsWith("note-") ? undefined : note.id,
        title: note.title || "Untitled",
        content: note.content,
        tags: encodeTags(note.isLocked, note.password),
        type: "note",
        user_id: user.id,
        updated_at: new Date().toISOString(),
        status: "todo",
      }, { onConflict: "id" });
    } catch {
      // silent
    }
    setSyncing(false);
  }, [user]);

  const handleUpdate = useCallback((id: string, patch: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch, synced: false } : n));
    if (!user) return;
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => {
      setNotes(prev => {
        const note = prev.find(n => n.id === id);
        if (note) saveNote({ ...note, ...patch });
        return prev;
      });
    }, 700);
  }, [user, saveNote]);

  const handleLockToggle = useCallback((id: string) => {
    setNotes(prev => {
      const note = prev.find(n => n.id === id);
      if (!note) return prev;
      if (note.isLocked) {
        const updated = prev.map(n => n.id === id ? { ...n, isLocked: false, password: undefined, synced: false } : n);
        if (user) saveNote({ ...note, isLocked: false, password: undefined });
        setUnlockedIds(set => { const s = new Set(set); s.delete(id); return s; });
        return updated;
      } else {
        const pw = prompt("Set a password for this note (default: 1234)") || "1234";
        const updated = prev.map(n => n.id === id ? { ...n, isLocked: true, password: pw, synced: false } : n);
        if (user) saveNote({ ...note, isLocked: true, password: pw });
        return updated;
      }
    });
  }, [user, saveNote]);

  const addNote = useCallback(async () => {
    if (user) {
      const { data, error } = await supabase.from("tasks").insert({
        title: "New Note",
        content: "<p><b>New Note</b></p><p><br></p>",
        tags: [],
        type: "note",
        user_id: user.id,
        status: "todo",
      }).select("id, title, content, tags, updated_at").single();
      if (!error && data) {
        const note = decodeNote(data);
        setNotes(prev => [note, ...prev]);
        setSelectedId(note.id);
        return;
      }
    }
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: "New Note",
      content: "<p><b>New Note</b></p><p><br></p>",
      isLocked: false,
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setSelectedId(newNote.id);
  }, [user]);

  const deleteNote = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user && !id.startsWith("note-")) {
      await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
    }
    setNotes(prev => {
      const remaining = prev.filter(n => n.id !== id);
      if (selectedId === id) setSelectedId(remaining[0]?.id || "");
      return remaining;
    });
  }, [user, selectedId]);

  const filtered = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Left Sidebar */}
      <div className="w-[160px] shrink-0 flex flex-col border-r border-white/8 bg-white/3">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white/60">Notes</span>
            {user && (
              syncing
                ? <Loader2 size={9} className="text-white/30 animate-spin" />
                : <Cloud size={9} className="text-white/20" />
            )}
            {!user && <CloudOff size={9} className="text-white/20" />}
          </div>
          <button
            onClick={addNote}
            className="w-5 h-5 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="px-2 pb-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/8">
            <Search size={10} className="text-white/30 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-[10px] text-white/70 outline-none placeholder:text-white/25 min-w-0"
            />
            {search && <button onClick={() => setSearch("")}><X size={9} className="text-white/30" /></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto council-hidden-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="animate-spin text-white/20" />
            </div>
          ) : (
            <>
              {filtered.map(note => {
                const isLocked = note.isLocked && !unlockedIds.has(note.id);
                const isActive = note.id === selectedId;
                return (
                  <button
                    key={note.id}
                    onClick={() => setSelectedId(note.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors group relative ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      {isLocked && <Lock size={9} className="text-amber-400/60 shrink-0" />}
                      <p className={`text-[11px] font-semibold truncate leading-tight ${isActive ? "text-white" : "text-white/65"}`}>
                        {note.title}
                      </p>
                    </div>
                    <p className="text-[9px] text-white/30 truncate">{formatRelativeTime(note.updatedAt)}</p>
                    <p className="text-[9px] text-white/25 truncate mt-0.5">{getPreview(note, unlockedIds.has(note.id))}</p>
                    <button
                      onClick={e => deleteNote(note.id, e)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors hidden group-hover:flex"
                    >
                      <Trash2 size={9} />
                    </button>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-[10px] text-white/25 text-center py-6">No notes found</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Editor */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <NoteContent
              notes={notes}
              selectedId={selectedId}
              onUpdate={handleUpdate}
              onLockToggle={handleLockToggle}
              unlockedIds={unlockedIds}
              onUnlock={id => setUnlockedIds(prev => new Set([...prev, id]))}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

const NotesWidget = () => (
  <DraggableWidget id="notes" title="Notes" defaultPosition={{ x: 60, y: 80 }} defaultSize={{ w: 520, h: 460 }}>
    <NotesWidgetContent />
  </DraggableWidget>
);

export default NotesWidget;
