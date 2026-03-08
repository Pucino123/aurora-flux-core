import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Search, Plus, Bold, Italic, Underline, Trash2, Eye, EyeOff, X } from "lucide-react";
import DraggableWidget from "./DraggableWidget";

interface Note {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  password?: string;
  updatedAt: string;
}

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Project Brainstorm",
    content: "Project Brainstorm\n\nIdeas for Q2 launch:\n• Revamp onboarding flow\n• Add AI-powered suggestions\n• Mobile-first redesign\n\nKey metrics to watch: retention, DAU, conversion.",
    isLocked: false,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "note-2",
    title: "Personal Goals",
    content: "Personal Goals",
    isLocked: true,
    password: "1234",
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "note-3",
    title: "Meeting Notes — April",
    content: "Meeting Notes — April\n\nAttendees: Sarah, John, Marcus\nAgenda:\n1. Q1 review\n2. Budget allocation\n3. Hiring plans\n\nDecisions: Approved 2 new hires in engineering.",
    isLocked: false,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "note-4",
    title: "Reading List",
    content: "Reading List\n\n• Atomic Habits — James Clear ✓\n• Deep Work — Cal Newport\n• The Lean Startup — Eric Ries\n• Zero to One — Peter Thiel\n• Thinking, Fast and Slow",
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
  const lines = note.content.split("\n").filter(l => l.trim());
  return lines.slice(1, 3).join(" ") || "No additional text";
};

const NoteContent: React.FC<{ notes: Note[]; selectedId: string; setNotes: (n: Note[]) => void; unlockedIds: Set<string> }> = ({
  notes,
  selectedId,
  setNotes,
  unlockedIds,
}) => {
  const note = notes.find(n => n.id === selectedId);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [localUnlocked, setLocalUnlocked] = useState<Set<string>>(new Set());

  const isEffectivelyUnlocked = !note?.isLocked || localUnlocked.has(selectedId) || unlockedIds.has(selectedId);

  const handleUnlock = () => {
    if (!note) return;
    if (pwInput === (note.password || "1234")) {
      setLocalUnlocked(prev => new Set([...prev, selectedId]));
      setPwInput("");
      setPwError(false);
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 1500);
    }
  };

  const handleContentChange = (val: string) => {
    setNotes(notes.map(n => n.id === selectedId ? { ...n, content: val, title: val.split("\n")[0] || "Untitled", updatedAt: new Date().toISOString() } : n));
  };

  const toggleLock = () => {
    if (!note) return;
    if (note.isLocked) {
      setNotes(notes.map(n => n.id === selectedId ? { ...n, isLocked: false, password: undefined } : n));
      setLocalUnlocked(prev => { const s = new Set(prev); s.delete(selectedId); return s; });
    } else {
      const pw = prompt("Set a password for this note (default: 1234)") || "1234";
      setNotes(notes.map(n => n.id === selectedId ? { ...n, isLocked: true, password: pw } : n));
    }
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
          <button
            onClick={handleUnlock}
            className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/8">
        {[{ icon: Bold, label: "Bold" }, { icon: Italic, label: "Italic" }, { icon: Underline, label: "Underline" }].map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
          >
            <Icon size={12} />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleLock}
          title={note.isLocked ? "Unlock Note" : "Lock Note"}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${note.isLocked ? "text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/10" : "text-white/30 hover:text-white/60 hover:bg-white/8"}`}
        >
          {note.isLocked ? <><Unlock size={11} /> Unlock</> : <><Lock size={11} /> Lock</>}
        </button>
      </div>
      {/* Editor */}
      <textarea
        ref={textRef}
        value={note.content}
        onChange={e => handleContentChange(e.target.value)}
        className="flex-1 w-full bg-transparent text-white/80 text-[13px] leading-relaxed resize-none outline-none px-4 py-3 placeholder:text-white/20 council-hidden-scrollbar"
        placeholder="Start writing..."
        style={{ fontFamily: "inherit" }}
      />
    </div>
  );
};

const NotesWidgetContent = () => {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_NOTES[0].id);
  const [search, setSearch] = useState("");
  const [unlockedIds] = useState<Set<string>>(new Set());

  const filtered = notes.filter(n =>
    !search || n.title.toLowerCase().includes(search.toLowerCase())
  );

  const addNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: "New Note",
      content: "New Note\n\n",
      isLocked: false,
      updatedAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    setSelectedId(newNote.id);
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id || "");
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Left Sidebar */}
      <div className="w-[160px] shrink-0 flex flex-col border-r border-white/8 bg-white/3">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-xs font-semibold text-white/60">Notes</span>
          <button onClick={addNote} className="w-5 h-5 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <Plus size={12} />
          </button>
        </div>
        {/* Search */}
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
        {/* Note list */}
        <div className="flex-1 overflow-y-auto council-hidden-scrollbar">
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
              setNotes={setNotes}
              unlockedIds={unlockedIds}
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
