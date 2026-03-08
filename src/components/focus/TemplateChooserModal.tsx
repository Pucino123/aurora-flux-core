import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlignLeft } from "lucide-react";

type DocType = "text" | "spreadsheet";

interface Template {
  id: string;
  title: string;
  subtitle: string;
  type: DocType;
  category: string;
  thumbnail: React.ReactNode;
  content?: any;
}

const TEMPLATES: Template[] = [
  {
    id: "blank-text",
    title: "Blank Document",
    subtitle: "Start from scratch",
    type: "text",
    category: "Blank",
    thumbnail: (
      <div className="w-full h-full bg-white flex flex-col p-3 gap-2">
        <div className="w-3/4 h-2 rounded-full bg-slate-200" />
        <div className="flex-1 flex flex-col gap-1.5 pt-1">
          <div className="w-full h-1.5 rounded-full bg-slate-100" />
          <div className="w-5/6 h-1.5 rounded-full bg-slate-100" />
          <div className="w-full h-1.5 rounded-full bg-slate-100" />
          <div className="w-4/6 h-1.5 rounded-full bg-slate-100" />
        </div>
      </div>
    ),
  },
  {
    id: "blank-spreadsheet",
    title: "Blank Spreadsheet",
    subtitle: "Empty grid to fill",
    type: "spreadsheet",
    category: "Blank",
    thumbnail: (
      <div
        className="w-full h-full bg-white"
        style={{
          backgroundImage:
            "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
          backgroundSize: "20% 14px",
        }}
      >
        <div className="flex border-b border-slate-300 bg-slate-50">
          {[16, 20, 20, 20, 20].map((w, i) => (
            <div
              key={i}
              className="border-r border-slate-300 text-[4px] text-slate-400 flex items-center justify-center"
              style={{ width: `${w}%`, height: 10 }}
            >
              {i === 0 ? "" : String.fromCharCode(64 + i)}
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} className="flex border-b border-slate-200">
            {[16, 20, 20, 20, 20].map((w, c) => (
              <div
                key={c}
                className="border-r border-slate-200 text-[4px] text-slate-300 flex items-center pl-0.5"
                style={{ width: `${w}%`, height: 9 }}
              >
                {c === 0 ? r + 1 : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "modern-invoice",
    title: "Modern Invoice",
    subtitle: "Professional billing",
    type: "spreadsheet",
    category: "Business & Finance",
    content: {
      rows: [
        ["INVOICE", "", "", "", ""],
        ["", "", "", "", ""],
        ["Bill To:", "", "", "Invoice #:", "001"],
        ["Client Name", "", "", "Date:", new Date().toLocaleDateString()],
        ["", "", "", "Due Date:", ""],
        ["", "", "", "", ""],
        ["Description", "Qty", "Rate", "Amount", ""],
        ["Service 1", "1", "$0.00", "$0.00", ""],
        ["Service 2", "1", "$0.00", "$0.00", ""],
        ["", "", "", "", ""],
        ["", "", "Subtotal", "$0.00", ""],
        ["", "", "Tax (0%)", "$0.00", ""],
        ["", "", "Total", "$0.00", ""],
      ],
    },
    thumbnail: (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="bg-slate-800 px-3 py-2 flex items-center justify-between">
          <div className="w-8 h-1.5 bg-white/30 rounded-full" />
          <div className="w-6 h-1.5 bg-white/20 rounded-full" />
        </div>
        <div className="px-3 pt-2 pb-1 flex justify-between gap-2">
          <div className="flex flex-col gap-1">
            <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
            <div className="w-8 h-1 bg-slate-200 rounded-full" />
          </div>
          <div className="flex flex-col gap-1 items-end">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
            <div className="w-8 h-1 bg-slate-200 rounded-full" />
          </div>
        </div>
        <div className="flex-1 px-3 flex flex-col gap-1 pt-1">
          <div className="flex gap-1 border-b border-slate-200 pb-0.5">
            <div className="flex-1 h-1 bg-slate-300 rounded-full" />
            <div className="w-4 h-1 bg-slate-300 rounded-full" />
            <div className="w-5 h-1 bg-slate-300 rounded-full" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-1">
              <div className="flex-1 h-1 bg-slate-100 rounded-full" />
              <div className="w-4 h-1 bg-slate-100 rounded-full" />
              <div className="w-5 h-1 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
        <div className="mx-3 mb-2 mt-1 self-end">
          <div className="bg-slate-800 rounded px-2 py-1 flex gap-3 items-center">
            <div className="w-6 h-1 bg-white/30 rounded-full" />
            <div className="w-6 h-1.5 bg-white/60 rounded-full" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "project-proposal",
    title: "Project Proposal",
    subtitle: "Pitch your idea",
    type: "text",
    category: "Project Management",
    content: {
      html: `<h1>Project Proposal</h1>
<h2>Executive Summary</h2>
<p>Provide a brief overview of the project and its goals.</p>
<h2>Problem Statement</h2>
<p>Describe the problem this project aims to solve.</p>
<h2>Proposed Solution</h2>
<p>Explain your approach and methodology.</p>
<h2>Timeline</h2>
<p>Outline key milestones and deliverables.</p>
<h2>Budget</h2>
<p>Summarize the estimated costs.</p>
<h2>Team</h2>
<p>List the key team members and their roles.</p>`,
    },
    thumbnail: (
      <div className="w-full h-full bg-white flex flex-col overflow-hidden">
        <div
          className="w-full flex items-end pb-2 px-3"
          style={{ height: "44%", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
        >
          <div className="flex flex-col gap-1">
            <div className="w-16 h-2 bg-white/70 rounded-full" />
            <div className="w-10 h-1.5 bg-white/40 rounded-full" />
          </div>
        </div>
        <div className="flex-1 px-3 pt-2 flex gap-2">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="w-full h-1.5 bg-slate-200 rounded-full" />
            <div className="w-4/5 h-1 bg-slate-100 rounded-full" />
            <div className="w-full h-1 bg-slate-100 rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="w-full h-1.5 bg-slate-200 rounded-full" />
            <div className="w-4/5 h-1 bg-slate-100 rounded-full" />
            <div className="w-full h-1 bg-slate-100 rounded-full" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "meeting-minutes",
    title: "Meeting Minutes",
    subtitle: "Capture decisions & actions",
    type: "text",
    category: "Notes & Meetings",
    content: {
      html: `<h1>Meeting Minutes</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong> </p>
<p><strong>Facilitator:</strong> </p>
<hr />
<h2>Agenda</h2>
<ol><li>Item 1</li><li>Item 2</li><li>Item 3</li></ol>
<h2>Discussion Notes</h2>
<p>Key points discussed:</p>
<ul><li>Point 1</li><li>Point 2</li></ul>
<h2>Action Items</h2>
<ul><li>[ ] Action 1 — Owner: — Due: </li><li>[ ] Action 2 — Owner: — Due: </li></ul>
<h2>Next Meeting</h2>
<p>Date & time: </p>`,
    },
    thumbnail: (
      <div className="w-full h-full bg-white flex flex-col px-3 py-2.5 gap-2">
        <div className="w-3/4 h-2 bg-slate-700 rounded-full" />
        <div className="w-1/2 h-1 bg-slate-300 rounded-full" />
        <div className="w-full h-px bg-slate-200 my-0.5" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
            <div className="h-1.5 bg-slate-200 rounded-full" style={{ width: `${40 + i * 15}%` }} />
          </div>
        ))}
        <div className="w-full h-px bg-slate-200 my-0.5" />
        {[1, 2].map(i => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded border border-slate-300 shrink-0" />
            <div className="h-1 bg-slate-100 rounded-full" style={{ width: `${50 + i * 10}%` }} />
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "crm-pipeline",
    title: "CRM Pipeline",
    subtitle: "Track contacts & deals",
    type: "spreadsheet",
    category: "CRM & Sales",
    content: {
      rows: [
        ["Contact Name", "Company", "Stage", "Deal Value", "Last Contacted"],
        ["Sarah Johnson", "Acme Corp", "Qualified", "$12,500", new Date(Date.now() - 86400000).toLocaleDateString()],
        ["Michael Chen", "TechStart Inc", "Proposal Sent", "$8,200", new Date(Date.now() - 172800000).toLocaleDateString()],
        ["Emily Rodriguez", "GlobalReach", "Negotiation", "$31,000", new Date(Date.now() - 259200000).toLocaleDateString()],
        ["David Kim", "Bright Solutions", "Demo Scheduled", "$5,750", new Date(Date.now() - 345600000).toLocaleDateString()],
        ["Anna Müller", "NovaTech GmbH", "Closed Won", "$19,800", new Date(Date.now() - 432000000).toLocaleDateString()],
      ],
    },
    thumbnail: (
      <div className="w-full h-full bg-white flex flex-col">
        {/* Header row */}
        <div className="flex border-b-2 border-emerald-500 bg-emerald-50 px-2 py-1 gap-1">
          {["Contact", "Stage", "Value"].map((h, i) => (
            <div key={i} className="flex-1 text-[4px] font-bold text-emerald-700 truncate">{h}</div>
          ))}
        </div>
        {/* Data rows */}
        {[
          ["S. Johnson", "Qualified", "$12.5k"],
          ["M. Chen", "Proposal", "$8.2k"],
          ["E. Rodriguez", "Negotiation", "$31k"],
          ["D. Kim", "Demo", "$5.7k"],
          ["A. Müller", "Closed ✓", "$19.8k"],
        ].map((row, i) => (
          <div key={i} className="flex px-2 py-0.5 gap-1 border-b border-slate-100">
            {row.map((cell, j) => (
              <div
                key={j}
                className="flex-1 text-[4px] truncate"
                style={{
                  color: j === 1
                    ? cell.includes("Closed") ? "#16a34a" : cell.includes("Negotiation") ? "#d97706" : "#3b82f6"
                    : "#475569",
                  fontWeight: j === 0 ? "600" : "400",
                }}
              >
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },
];

const CATEGORIES = [
  "All",
  "Blank",
  "Business & Finance",
  "Project Management",
  "Notes & Meetings",
  "CRM & Sales",
];

interface TemplateChooserModalProps {
  onCreateDocument: (title: string, type: DocType, content?: any) => void;
  onClose: () => void;
}

const TemplateChooserModal = ({ onCreateDocument, onClose }: TemplateChooserModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank-text");
  const modalRef = useRef<HTMLDivElement>(null);

  const filtered = selectedCategory === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === selectedCategory);
  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) ?? TEMPLATES[0];

  // Keep selection valid when category changes
  const handleCategoryChange = useCallback((cat: string) => {
    setSelectedCategory(cat);
    const newFiltered = cat === "All" ? TEMPLATES : TEMPLATES.filter(t => t.category === cat);
    if (newFiltered.length > 0 && !newFiltered.find(t => t.id === selectedTemplateId)) {
      setSelectedTemplateId(newFiltered[0].id);
    }
  }, [selectedTemplateId]);

  const handleCreate = useCallback(() => {
    onCreateDocument(selectedTemplate.title, selectedTemplate.type, selectedTemplate.content);
    onClose();
  }, [selectedTemplate, onCreateDocument, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Enter") { handleCreate(); return; }

      const catIndex = CATEGORIES.indexOf(selectedCategory);

      if (e.key === "Tab") {
        e.preventDefault();
        const next = e.shiftKey
          ? (catIndex - 1 + CATEGORIES.length) % CATEGORIES.length
          : (catIndex + 1) % CATEGORIES.length;
        handleCategoryChange(CATEGORIES[next]);
        return;
      }

      const currentIndex = filtered.findIndex(t => t.id === selectedTemplateId);
      const cols = 3;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = Math.min(currentIndex + 1, filtered.length - 1);
        setSelectedTemplateId(filtered[next].id);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = Math.max(currentIndex - 1, 0);
        setSelectedTemplateId(filtered[prev].id);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(currentIndex + cols, filtered.length - 1);
        setSelectedTemplateId(filtered[next].id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(currentIndex - cols, 0);
        setSelectedTemplateId(filtered[prev].id);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, handleCreate, filtered, selectedTemplateId, selectedCategory, handleCategoryChange]);

  // Auto-focus modal on mount
  useEffect(() => { modalRef.current?.focus(); }, []);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="template-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9980] flex items-center justify-center"
        style={{ background: "rgba(2,2,10,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />
      <motion.div
        key="template-modal"
        initial={{ opacity: 0, scale: 0.93, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 24 }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
        className="fixed inset-0 z-[9981] flex items-center justify-center pointer-events-none"
      >
        <div
          ref={modalRef}
          tabIndex={-1}
          className="pointer-events-auto flex flex-col rounded-2xl shadow-2xl overflow-hidden outline-none"
          style={{
            width: 860,
            height: 580,
            background: "rgba(12, 10, 28, 0.97)",
            backdropFilter: "blur(48px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Traffic light title bar */}
          <div
            className="flex items-center gap-2 px-5"
            style={{
              height: 44,
              background: "rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <button
              onClick={onClose}
              className="group flex items-center justify-center"
              style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.25)", boxShadow: "0 0.5px 2px rgba(0,0,0,0.3)" }}
            >
              <X size={7} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(80,0,0,0.75)" }} />
            </button>
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.2)" }} />
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#28c840", border: "0.5px solid rgba(0,0,0,0.2)" }} />
            <span className="flex-1 text-center text-[13px] font-medium text-white/50 -ml-8 select-none">
              Choose a Template
            </span>
            <span className="text-[10px] text-white/20 select-none">↑↓←→ navigate · Tab switch category · ↵ create · Esc cancel</span>
          </div>

          {/* Body: sidebar + content */}
          <div className="flex flex-1 min-h-0">
            {/* Left sidebar — Tab navigates categories */}
            <div
              className="flex flex-col gap-0.5 py-4 px-2 overflow-y-auto"
              style={{
                width: 192,
                background: "rgba(255,255,255,0.02)",
                borderRight: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-1.5">
                Categories <span className="text-white/15 normal-case tracking-normal">(Tab)</span>
              </p>
              {CATEGORIES.map((cat, idx) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150"
                  style={{
                    background: selectedCategory === cat ? "rgba(59,130,246,0.9)" : "transparent",
                    color: selectedCategory === cat ? "#fff" : "rgba(255,255,255,0.5)",
                  }}
                  onMouseEnter={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Right content area */}
            <div className="flex-1 overflow-y-auto px-8 py-6 bg-transparent">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
                  <AlignLeft size={32} />
                  <p className="text-sm">No templates in this category yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6">
                  {filtered.map(template => {
                    const isSelected = template.id === selectedTemplateId;
                    return (
                      <div
                        key={template.id}
                        className="flex flex-col items-center gap-3 cursor-pointer group"
                        onClick={() => setSelectedTemplateId(template.id)}
                        onDoubleClick={handleCreate}
                      >
                        <div
                          className="transition-all duration-200"
                          style={{
                            borderRadius: 8,
                            overflow: "hidden",
                            width: 128,
                            aspectRatio: "1 / 1.4",
                            boxShadow: isSelected
                              ? "0 0 0 3px rgba(59,130,246,1), 0 8px 32px rgba(59,130,246,0.3)"
                              : "0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
                            transform: isSelected ? "scale(1.04)" : undefined,
                          }}
                        >
                          {template.thumbnail}
                        </div>
                        <div className="text-center">
                          <p
                            className="text-[12px] font-semibold transition-colors"
                            style={{ color: isSelected ? "rgba(147,197,253,1)" : "rgba(255,255,255,0.8)" }}
                          >
                            {template.title}
                          </p>
                          <p className="text-[10px] text-white/30 mt-0.5">{template.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div
            className="flex items-center justify-between px-6"
            style={{
              height: 64,
              background: "rgba(255,255,255,0.03)",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="text-[11px] text-white/30">
              {selectedTemplate && (
                <span>
                  <span className="text-white/50 font-medium">{selectedTemplate.title}</span>
                  {" · "}
                  {selectedTemplate.type === "text" ? "Word Document" : "Spreadsheet"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all"
                style={{ background: "rgba(59,130,246,0.95)", color: "#fff", boxShadow: "0 4px 16px rgba(59,130,246,0.4)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(96,165,250,0.95)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(59,130,246,0.95)")}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default TemplateChooserModal;
