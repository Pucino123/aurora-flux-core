import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlignLeft, Sun, Moon, Star } from "lucide-react";

const LS_FAVORITES = "flux_template_favorites";

type DocType = "text" | "spreadsheet";
type PreviewTheme = "light" | "dark";

interface Template {
  id: string;
  title: string;
  subtitle: string;
  type: DocType;
  category: string;
  thumbnail: (isDark: boolean) => React.ReactNode;
  content?: any;
}

// ─── Shared palette helpers ───────────────────────────────────────────────────
const p = (isDark: boolean) => ({
  paper: isDark ? "#1e293b" : "#ffffff",
  paperBorder: isDark ? "#334155" : "#e2e8f0",
  line: isDark ? "#334155" : "#e2e8f0",
  lineAlt: isDark ? "#3f4f66" : "#f1f5f9",
  block: isDark ? "#475569" : "#cbd5e1",
  blockSoft: isDark ? "#334155" : "#e2e8f0",
  muted: isDark ? "#64748b" : "#94a3b8",
  textDark: isDark ? "#94a3b8" : "#475569",
  heading: isDark ? "#cbd5e1" : "#1e293b",
});

// ─── Template catalog ────────────────────────────────────────────────────────
const TEMPLATES: Template[] = [
  // ── BLANK ────────────────────────────────────────────────────────────────
  {
    id: "blank-text",
    title: "Blank Document",
    subtitle: "Start from scratch",
    type: "text",
    category: "Blank",
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full flex flex-col p-3 gap-2" style={{ background: c.paper }}>
          <div className="w-3/4 h-2 rounded-full" style={{ background: c.block }} />
          <div className="flex-1 flex flex-col gap-1.5 pt-1">
            {[100, 83, 100, 67, 91, 75].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full" style={{ background: c.lineAlt, width: `${w}%` }} />
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: "blank-spreadsheet",
    title: "Blank Spreadsheet",
    subtitle: "Empty grid to fill",
    type: "spreadsheet",
    category: "Blank",
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full" style={{ background: c.paper }}>
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(to right, ${c.line} 1px, transparent 1px), linear-gradient(to bottom, ${c.line} 1px, transparent 1px)`,
              backgroundSize: "20% 14px",
            }}
          >
            <div className="flex border-b" style={{ borderColor: c.block, background: c.lineAlt }}>
              {[16, 21, 21, 21, 21].map((w, i) => (
                <div key={i} className="flex items-center justify-center text-[4px]"
                  style={{ width: `${w}%`, height: 10, borderRight: `1px solid ${c.block}`, color: c.muted }}>
                  {i === 0 ? "" : String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className="flex" style={{ borderBottom: `1px solid ${c.line}` }}>
                {[16, 21, 21, 21, 21].map((w, c2) => (
                  <div key={c2} className="flex items-center pl-0.5 text-[4px]"
                    style={{ width: `${w}%`, height: 9, borderRight: `1px solid ${c.line}`, color: c.muted }}>
                    {c2 === 0 ? r + 1 : ""}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    },
  },

  // ── BASIC (Word) ─────────────────────────────────────────────────────────
  {
    id: "academic-essay",
    title: "Academic Essay",
    subtitle: "Structured scholarly writing",
    type: "text",
    category: "Basic",
    content: {
      html: `<h1>Title of Essay</h1>
<p><em>Author Name · Course · Date</em></p>
<hr />
<h2>Abstract</h2>
<p>Provide a concise summary of the essay's main argument and conclusions in 150–250 words.</p>
<h2>Introduction</h2>
<p>Introduce the topic, state the thesis, and outline the structure of the essay.</p>
<h2>Background</h2>
<p>Provide context and relevant prior research or theory.</p>
<h2>Argument</h2>
<p>Develop the main argument with evidence and analysis.</p>
<h2>Conclusion</h2>
<p>Summarise findings and suggest areas for further research.</p>
<h2>References</h2>
<p>List all cited sources in the appropriate citation style.</p>`,
    },
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full flex flex-col px-3 pt-2.5 pb-2 gap-1.5" style={{ background: c.paper }}>
          {/* Title */}
          <div className="w-4/5 h-2 rounded-full mx-auto" style={{ background: c.block }} />
          <div className="w-1/2 h-1 rounded-full mx-auto" style={{ background: c.line }} />
          <div className="w-full h-px my-0.5" style={{ background: c.line }} />
          {/* Section heading */}
          <div className="w-2/5 h-1.5 rounded-full" style={{ background: c.blockSoft }} />
          {/* Dense text lines */}
          {[100, 100, 100, 92, 100, 100, 88].map((w, i) => (
            <div key={i} className="h-1 rounded-full" style={{ background: c.lineAlt, width: `${w}%` }} />
          ))}
          <div className="w-1/3 h-1.5 rounded-full mt-0.5" style={{ background: c.blockSoft }} />
          {[100, 100, 95].map((w, i) => (
            <div key={i} className="h-1 rounded-full" style={{ background: c.lineAlt, width: `${w}%` }} />
          ))}
        </div>
      );
    },
  },
  {
    id: "formal-letter",
    title: "Formal Letter",
    subtitle: "Professional correspondence",
    type: "text",
    category: "Basic",
    content: {
      html: `<p style="text-align:right">Your Name<br/>Your Address<br/>City, Postcode<br/>${new Date().toLocaleDateString()}</p>
<p><br/>Recipient Name<br/>Their Title<br/>Their Organisation<br/>Their Address</p>
<p><br/>Dear [Recipient Name],</p>
<h2>Re: [Subject of Letter]</h2>
<p>I am writing to you regarding [purpose]. Please find the relevant details below.</p>
<p>[Body paragraph 1]</p>
<p>[Body paragraph 2]</p>
<p>I trust the above is clear. Please do not hesitate to contact me should you require any further information.</p>
<p>Yours sincerely,</p>
<p><br/><strong>Your Name</strong></p>`,
    },
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full flex flex-col p-2.5 gap-1" style={{ background: c.paper }}>
          {/* Sender block — top right */}
          <div className="self-end flex flex-col gap-0.5 items-end mb-0.5">
            {[28, 22, 24, 18].map((w, i) => (
              <div key={i} className="h-1 rounded-full" style={{ background: c.blockSoft, width: w }} />
            ))}
          </div>
          {/* Recipient block — left */}
          <div className="flex flex-col gap-0.5 mb-1">
            {[26, 20, 22].map((w, i) => (
              <div key={i} className="h-1 rounded-full" style={{ background: c.blockSoft, width: w }} />
            ))}
          </div>
          {/* Greeting */}
          <div className="w-2/5 h-1 rounded-full" style={{ background: c.line }} />
          {/* Subject */}
          <div className="w-1/2 h-1.5 rounded-full" style={{ background: c.block }} />
          {/* Body paragraphs */}
          {[100, 100, 82, 100, 100, 75, 100, 88].map((w, i) => (
            <div key={i} className="h-1 rounded-full" style={{ background: c.lineAlt, width: `${w}%` }} />
          ))}
          {/* Sign-off */}
          <div className="w-1/3 h-1 rounded-full mt-1" style={{ background: c.line }} />
          <div className="w-1/4 h-1.5 rounded-full" style={{ background: c.blockSoft }} />
        </div>
      );
    },
  },

  // ── BUSINESS & FINANCE ───────────────────────────────────────────────────
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
    thumbnail: (isDark) => {
      const c = p(isDark);
      const headerBg = isDark ? "#0f172a" : "#1e293b";
      return (
        <div className="w-full h-full flex flex-col" style={{ background: c.paper }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ background: headerBg }}>
            <div className="w-8 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
            <div className="w-6 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>
          <div className="px-3 pt-2 pb-1 flex justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="w-10 h-1.5 rounded-full" style={{ background: c.block }} />
              <div className="w-8 h-1 rounded-full" style={{ background: c.line }} />
            </div>
            <div className="flex flex-col gap-0.5 items-end">
              <div className="w-10 h-1 rounded-full" style={{ background: c.line }} />
              <div className="w-8 h-1 rounded-full" style={{ background: c.line }} />
            </div>
          </div>
          <div className="flex-1 px-3 flex flex-col gap-1 pt-1">
            <div className="flex gap-1 pb-0.5" style={{ borderBottom: `1px solid ${c.line}` }}>
              <div className="flex-1 h-1 rounded-full" style={{ background: c.block }} />
              <div className="w-4 h-1 rounded-full" style={{ background: c.block }} />
              <div className="w-5 h-1 rounded-full" style={{ background: c.block }} />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-1">
                <div className="flex-1 h-1 rounded-full" style={{ background: c.line }} />
                <div className="w-4 h-1 rounded-full" style={{ background: c.line }} />
                <div className="w-5 h-1 rounded-full" style={{ background: c.line }} />
              </div>
            ))}
          </div>
          <div className="mx-3 mb-2 mt-1 self-end">
            <div className="rounded px-2 py-1 flex gap-3 items-center" style={{ background: headerBg }}>
              <div className="w-6 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
              <div className="w-6 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.55)" }} />
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "saas-churn",
    title: "SaaS Churn Dashboard",
    subtitle: "Track retention metrics",
    type: "spreadsheet",
    category: "Business & Finance",
    content: {
      rows: [
        ["Metric", "Jan", "Feb", "Mar", "Apr", "May"],
        ["Total Customers", "1200", "1350", "1480", "1620", "1755"],
        ["New Customers", "200", "180", "210", "195", "220"],
        ["Churned", "50", "30", "80", "55", "45"],
        ["Churn Rate %", "4.2%", "2.2%", "5.4%", "3.4%", "2.6%"],
        ["MRR ($)", "$42,000", "$47,250", "$51,800", "$56,700", "$61,425"],
        ["Net Revenue Churn", "-1.8%", "-0.5%", "-2.1%", "-1.2%", "-0.9%"],
      ],
    },
    thumbnail: (isDark) => {
      const c = p(isDark);
      const emeraldBg = isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)";
      const emeraldBorder = isDark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.25)";
      const barHeights = [60, 80, 45, 70, 90, 55];
      const barColor = isDark ? "#3b82f6" : "#6366f1";
      return (
        <div className="w-full h-full flex flex-col p-2 gap-1.5" style={{ background: c.paper }}>
          {/* 3 metric cards */}
          <div className="flex gap-1">
            {[{ label: "MRR", v: "$61k", c: emeraldBg, b: emeraldBorder },
              { label: "Churn", v: "2.6%", c: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)", b: isDark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)" },
              { label: "NRR", v: "108%", c: emeraldBg, b: emeraldBorder }
            ].map((m, i) => (
              <div key={i} className="flex-1 rounded flex flex-col items-center justify-center py-1 gap-0.5"
                style={{ background: m.c, border: `0.5px solid ${m.b}` }}>
                <div className="text-[3.5px] font-medium" style={{ color: c.muted }}>{m.label}</div>
                <div className="text-[5px] font-bold" style={{ color: c.textDark }}>{m.v}</div>
              </div>
            ))}
          </div>
          {/* Bar chart */}
          <div className="flex-1 flex items-end gap-0.5 px-1 pt-1" style={{ borderTop: `1px solid ${c.line}` }}>
            {barHeights.map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: barColor, opacity: 0.7 + i * 0.05 }} />
            ))}
          </div>
          {/* X axis */}
          <div className="flex gap-0.5 px-1">
            {["J", "F", "M", "A", "M", "J"].map((l, i) => (
              <div key={i} className="flex-1 text-center text-[3px]" style={{ color: c.muted }}>{l}</div>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: "roi-calculator",
    title: "ROI Calculator",
    subtitle: "Measure investment returns",
    type: "spreadsheet",
    category: "Business & Finance",
    content: {
      rows: [
        ["Personal ROI Calculator", "", "", "", ""],
        ["", "", "", "", ""],
        ["Investment Details", "", "", "", ""],
        ["Initial Investment ($)", "", "", "$10,000", ""],
        ["Final Value ($)", "", "", "$24,700", ""],
        ["Time Period (Years)", "", "", "3", ""],
        ["", "", "", "", ""],
        ["Results", "", "", "", ""],
        ["Total Return ($)", "", "", "$14,700", ""],
        ["ROI (%)", "", "", "147%", ""],
        ["Annualised Return (%)", "", "", "34.7%", ""],
        ["Multiplier", "", "", "2.47x", ""],
      ],
    },
    thumbnail: (isDark) => {
      const c = p(isDark);
      const gridLine = isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)";
      return (
        <div className="w-full h-full relative flex items-center justify-center" style={{ background: c.paper }}>
          {/* Grid overlay */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
          }} />
          {/* Centered ROI number */}
          <div className="relative flex flex-col items-center gap-0.5">
            <div className="text-[8px] font-bold" style={{ color: isDark ? "#a78bfa" : "#6366f1", letterSpacing: "-0.5px" }}>147%</div>
            <div className="text-[4px]" style={{ color: c.muted }}>Total ROI</div>
            <div className="w-12 h-px my-0.5" style={{ background: c.line }} />
            <div className="flex gap-3">
              {[{ l: "2.47x", s: "Multiplier" }, { l: "34.7%", s: "Annual" }].map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <div className="text-[5.5px] font-semibold" style={{ color: c.textDark }}>{m.l}</div>
                  <div className="text-[3px]" style={{ color: c.muted }}>{m.s}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Corner labels */}
          {[["top-2 left-2", "Initial"], ["top-2 right-2", "Final"], ["bottom-2 left-2", "3 Yrs"], ["bottom-2 right-2", "$14.7k"]].map(([pos, label], i) => (
            <div key={i} className={`absolute ${pos} text-[3px]`} style={{ color: c.muted }}>{label}</div>
          ))}
        </div>
      );
    },
  },

  // ── PROJECT MANAGEMENT ───────────────────────────────────────────────────
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
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: c.paper }}>
          <div className="w-full flex items-end pb-2 px-3" style={{
            height: "44%",
            background: isDark
              ? "linear-gradient(135deg, #312e81 0%, #4c1d95 100%)"
              : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          }}>
            <div className="flex flex-col gap-1">
              <div className="w-16 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.7)" }} />
              <div className="w-10 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
            </div>
          </div>
          <div className="flex-1 px-3 pt-2 flex gap-2">
            {[0, 1].map(col => (
              <div key={col} className="flex flex-col gap-1.5 flex-1">
                <div className="w-full h-1.5 rounded-full" style={{ background: c.blockSoft }} />
                <div className="w-4/5 h-1 rounded-full" style={{ background: c.line }} />
                <div className="w-full h-1 rounded-full" style={{ background: c.line }} />
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: "employee-schedule",
    title: "Employee Schedule",
    subtitle: "Weekly shift planner",
    type: "spreadsheet",
    category: "Project Management",
    content: {
      rows: [
        ["Employee", "Mon", "Tue", "Wed", "Thu", "Fri"],
        ["Alice M.", "9–5", "9–5", "OFF", "9–5", "9–3"],
        ["Bob T.", "OFF", "10–6", "10–6", "10–6", "10–6"],
        ["Carol S.", "8–4", "8–4", "8–4", "OFF", "8–4"],
        ["David L.", "12–8", "OFF", "12–8", "12–8", "12–8"],
        ["Eva K.", "9–5", "9–5", "9–5", "9–5", "OFF"],
      ],
    },
    thumbnail: (isDark) => {
      const c = p(isDark);
      const shiftColors = [
        isDark ? "#1d4ed8" : "#3b82f6",
        isDark ? "#047857" : "#10b981",
        isDark ? "#7c3aed" : "#8b5cf6",
        isDark ? "#b45309" : "#f59e0b",
      ];
      const days = ["M", "T", "W", "T", "F"];
      const employees = ["Alice", "Bob", "Carol", "David", "Eva"];
      const offPattern = [[2], [0], [3], [1], [4]];
      return (
        <div className="w-full h-full flex flex-col" style={{ background: c.paper }}>
          {/* Header row */}
          <div className="flex" style={{ borderBottom: `1.5px solid ${c.block}` }}>
            <div className="w-10 text-[4px] flex items-center px-1.5 py-1" style={{ color: c.muted, borderRight: `1px solid ${c.line}` }}>Name</div>
            {days.map((d, i) => (
              <div key={i} className="flex-1 text-center text-[4px] font-bold py-1" style={{ color: c.textDark, borderRight: i < 4 ? `1px solid ${c.line}` : undefined }}>{d}</div>
            ))}
          </div>
          {employees.map((emp, r) => (
            <div key={r} className="flex" style={{ borderBottom: `1px solid ${c.line}` }}>
              <div className="w-10 text-[3.5px] flex items-center px-1.5 py-0.5" style={{ color: c.muted, borderRight: `1px solid ${c.line}` }}>{emp}</div>
              {days.map((_, col) => {
                const isOff = offPattern[r].includes(col);
                return (
                  <div key={col} className="flex-1 flex items-center justify-center py-0.5"
                    style={{ borderRight: col < 4 ? `1px solid ${c.line}` : undefined }}>
                    {isOff
                      ? <div className="w-3 h-1.5 rounded-sm text-[3px] flex items-center justify-center" style={{ background: c.lineAlt, color: c.muted }}>—</div>
                      : <div className="w-3 h-2 rounded-sm" style={{ background: shiftColors[r % shiftColors.length], opacity: 0.8 }} />
                    }
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    },
  },

  // ── NOTES & MEETINGS ─────────────────────────────────────────────────────
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
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full flex flex-col px-3 py-2.5 gap-1.5" style={{ background: c.paper }}>
          <div className="w-3/4 h-2 rounded-full" style={{ background: c.block }} />
          <div className="w-1/2 h-1 rounded-full" style={{ background: c.blockSoft }} />
          <div className="w-full h-px my-0.5" style={{ background: c.line }} />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.blockSoft }} />
              <div className="h-1.5 rounded-full" style={{ background: c.lineAlt, width: `${40 + i * 15}%` }} />
            </div>
          ))}
          <div className="w-full h-px my-0.5" style={{ background: c.line }} />
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded shrink-0" style={{ border: `1px solid ${c.blockSoft}` }} />
              <div className="h-1 rounded-full" style={{ background: c.lineAlt, width: `${50 + i * 10}%` }} />
            </div>
          ))}
        </div>
      );
    },
  },
  {
    id: "modern-newsletter",
    title: "Modern Newsletter",
    subtitle: "Engaging email / digest",
    type: "text",
    category: "Notes & Meetings",
    content: {
      html: `<div style="max-width:600px; margin:0 auto; font-family:sans-serif">
<div style="background:#6366f1; padding:32px; text-align:center">
  <h1 style="color:white; margin:0">Newsletter Title</h1>
  <p style="color:rgba(255,255,255,0.8)">Issue #1 · ${new Date().toLocaleDateString()}</p>
</div>
<h2>Top Story</h2>
<p>Lead article body goes here. Keep this paragraph punchy and engaging — aim for 2–3 sentences that hook the reader.</p>
<hr />
<h2>Section One</h2>
<p>First section content — add your text, links, and imagery here.</p>
<h2>Section Two</h2>
<p>Second section content — short paragraph, then a call to action.</p>
<p style="text-align:center"><strong>→ Read more</strong></p>
<hr />
<p style="text-align:center; font-size:12px; color:#94a3b8">You're receiving this because you subscribed · Unsubscribe</p>
</div>`,
    },
    thumbnail: (isDark) => {
      const c = p(isDark);
      const heroGrad = isDark
        ? "linear-gradient(135deg, #312e81, #1e1b4b)"
        : "linear-gradient(135deg, #6366f1, #8b5cf6)";
      return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: c.paper }}>
          {/* Hero image block */}
          <div className="w-full flex flex-col items-center justify-end pb-1.5" style={{ height: "35%", background: heroGrad }}>
            <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.85)" }} />
            <div className="w-10 h-1 rounded-full mt-0.5" style={{ background: "rgba(255,255,255,0.4)" }} />
          </div>
          {/* Large headline */}
          <div className="px-2.5 pt-2 pb-1">
            <div className="w-4/5 h-2 rounded-full" style={{ background: c.block }} />
            <div className="w-full h-1 rounded-full mt-1" style={{ background: c.lineAlt }} />
            <div className="w-full h-1 rounded-full mt-0.5" style={{ background: c.lineAlt }} />
          </div>
          {/* Two columns */}
          <div className="flex gap-1.5 px-2.5 pt-0.5">
            {[0, 1].map(col => (
              <div key={col} className="flex-1 flex flex-col gap-0.5">
                <div className="w-3/4 h-1.5 rounded-full" style={{ background: c.blockSoft }} />
                {[100, 90, 100, 80].map((w, i) => (
                  <div key={i} className="h-1 rounded-full" style={{ background: c.lineAlt, width: `${w}%` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    },
  },

  // ── CREATIVE ─────────────────────────────────────────────────────────────
  {
    id: "creative-resume",
    title: "Creative Resume",
    subtitle: "Two-column dark sidebar layout",
    type: "text",
    category: "Creative",
    content: {
      html: `<div style="display:flex;max-width:800px;min-height:900px;margin:0 auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);border-radius:12px;overflow:hidden;font-family:system-ui,sans-serif">
  <aside style="width:33%;background:#0f172a;color:#e2e8f0;padding:32px 24px;display:flex;flex-direction:column;gap:24px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div style="width:96px;height:96px;border-radius:50%;background:#1e293b;border:3px solid #334155;display:flex;align-items:center;justify-content:center;font-size:32px">👤</div>
      <h2 style="color:white;font-size:22px;font-weight:800;margin:0;text-align:center">YOUR NAME</h2>
      <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center">Job Title</p>
    </div>
    <div>
      <h3 style="color:#60a5fa;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">Contact</h3>
      <p style="color:#cbd5e1;font-size:12px;margin:0 0 6px">📧 email@example.com</p>
      <p style="color:#cbd5e1;font-size:12px;margin:0 0 6px">📞 +1 234 567 890</p>
      <p style="color:#cbd5e1;font-size:12px;margin:0">🌐 yourwebsite.com</p>
    </div>
    <div>
      <h3 style="color:#60a5fa;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">Skills</h3>
      <p style="color:#94a3b8;font-size:12px;line-height:1.8;margin:0">React &amp; TypeScript<br/>UI / UX Design<br/>Product Strategy<br/>Data Analysis<br/>Team Leadership</p>
    </div>
    <div>
      <h3 style="color:#60a5fa;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">Education</h3>
      <p style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 2px">BSc Computer Science</p>
      <p style="color:#94a3b8;font-size:11px;margin:0">University Name · 2018</p>
    </div>
  </aside>
  <main style="flex:1;background:white;padding:36px 32px">
    <h1 style="font-size:40px;font-weight:900;color:#0f172a;margin:0 0 4px;letter-spacing:-1px">YOUR NAME</h1>
    <p style="color:#3b82f6;font-size:16px;font-weight:600;margin:0 0 24px">Lead Product Designer</p>
    <div style="border-top:2px solid #e2e8f0;padding-top:20px;margin-bottom:24px">
      <h2 style="font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0f172a;margin:0 0 16px">Experience</h2>
      <div style="margin-bottom:16px">
        <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0">Senior Designer · Company Name</p>
        <p style="font-size:12px;color:#64748b;margin:2px 0 6px">2021 – Present</p>
        <p style="font-size:13px;color:#475569;line-height:1.6;margin:0">Describe your key responsibilities and achievements here. Focus on impact and outcomes.</p>
      </div>
      <div>
        <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0">Designer · Previous Company</p>
        <p style="font-size:12px;color:#64748b;margin:2px 0 6px">2018 – 2021</p>
        <p style="font-size:13px;color:#475569;line-height:1.6;margin:0">Another role description with measurable achievements.</p>
      </div>
    </div>
    <div>
      <h2 style="font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0f172a;margin:0 0 12px">Projects</h2>
      <p style="font-size:13px;color:#475569;line-height:1.6;margin:0">Highlight key projects that showcase your best work here.</p>
    </div>
  </main>
</div>`,
    },
    thumbnail: (isDark) => {
      const sidebarBg = "#0f172a";
      const mainBg = isDark ? "#1e293b" : "#ffffff";
      const accentColor = "#3b82f6";
      return (
        <div className="w-full h-full flex overflow-hidden" style={{ background: mainBg }}>
          {/* Dark sidebar */}
          <div className="flex flex-col items-center p-2 gap-1.5" style={{ width: "35%", background: sidebarBg, flexShrink: 0 }}>
            {/* Avatar circle */}
            <div className="w-8 h-8 rounded-full mt-1" style={{ background: "#334155", border: "2px solid #475569" }} />
            {/* Name */}
            <div className="w-10 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.6)" }} />
            <div className="w-7 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
            {/* Divider */}
            <div className="w-full h-px mt-1" style={{ background: "#334155" }} />
            {/* Skills label */}
            <div className="w-6 h-1 rounded-full self-start" style={{ background: accentColor, opacity: 0.7 }} />
            {[55, 70, 48, 60].map((w, i) => (
              <div key={i} className="h-0.5 rounded-full self-start" style={{ width: `${w}%`, background: "rgba(255,255,255,0.25)" }} />
            ))}
          </div>
          {/* Light main */}
          <div className="flex flex-col p-2 gap-1.5" style={{ flex: 1 }}>
            <div className="w-4/5 h-2.5 rounded-full" style={{ background: isDark ? "#e2e8f0" : "#0f172a" }} />
            <div className="w-2/5 h-1.5 rounded-full" style={{ background: accentColor, opacity: 0.7 }} />
            <div className="w-full h-px mt-0.5" style={{ background: isDark ? "#334155" : "#e2e8f0" }} />
            {/* Section label */}
            <div className="w-1/2 h-1 rounded-full" style={{ background: isDark ? "#94a3b8" : "#0f172a" }} />
            {[100, 70, 100, 85].map((w, i) => (
              <div key={i} className="h-0.5 rounded-full" style={{ width: `${w}%`, background: isDark ? "#475569" : "#cbd5e1" }} />
            ))}
            <div className="w-full h-px" style={{ background: isDark ? "#334155" : "#e2e8f0" }} />
            <div className="w-1/2 h-1 rounded-full" style={{ background: isDark ? "#94a3b8" : "#0f172a" }} />
            {[100, 65].map((w, i) => (
              <div key={i} className="h-0.5 rounded-full" style={{ width: `${w}%`, background: isDark ? "#475569" : "#cbd5e1" }} />
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: "event-poster",
    title: "Event Poster",
    subtitle: "Full-bleed bold typography",
    type: "text",
    category: "Creative",
    content: {
      html: `<div style="text-align:center;background:#000000;color:#ffffff;padding:48px 40px;min-height:700px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;font-family:system-ui,sans-serif">
  <div style="width:100%;height:240px;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:40px;border:2px dashed rgba(255,255,255,0.15)">
    <p style="color:rgba(255,255,255,0.3);font-size:14px;margin:0">🖼️  Replace with Event Image</p>
  </div>
  <p style="color:rgba(255,255,255,0.5);font-size:13px;letter-spacing:6px;text-transform:uppercase;margin:0 0 16px">PRESENTS</p>
  <h1 style="font-size:72px;font-weight:900;letter-spacing:-3px;text-transform:uppercase;line-height:0.9;margin:0 0 24px;color:white">EVENT<br/>TITLE</h1>
  <div style="width:60px;height:4px;background:white;margin:0 0 24px"></div>
  <p style="color:rgba(255,255,255,0.7);font-size:18px;font-weight:500;margin:0 0 8px">📅 Day, Month DD, YYYY</p>
  <p style="color:rgba(255,255,255,0.5);font-size:15px;margin:0 0 32px">🕖 7:00 PM · 📍 Venue Name, City</p>
  <div style="background:white;color:black;padding:14px 40px;border-radius:9999px;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;display:inline-block">Get Tickets</div>
</div>`,
    },
    thumbnail: (isDark) => {
      return (
        <div className="w-full h-full flex flex-col items-center" style={{ background: "#000" }}>
          {/* Image block */}
          <div className="w-full flex items-center justify-center" style={{ height: "42%", background: "#1e293b", borderBottom: "1px dashed rgba(255,255,255,0.15)" }}>
            <div className="text-[5px]" style={{ color: "rgba(255,255,255,0.3)" }}>IMAGE</div>
          </div>
          {/* Typography block */}
          <div className="flex flex-col items-center gap-1 mt-2 px-2">
            <div className="w-8 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.35)" }} />
            <div className="w-14 h-3 rounded" style={{ background: "white", opacity: 0.9 }} />
            <div className="w-12 h-2 rounded" style={{ background: "white", opacity: 0.75 }} />
            <div className="w-2 h-0.5 my-0.5" style={{ background: "white" }} />
            <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
            <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
          </div>
          {/* CTA */}
          <div className="mt-1.5 px-3 py-0.5 rounded-full" style={{ background: "white" }}>
            <div className="w-10 h-1 rounded-full" style={{ background: "#000" }} />
          </div>
        </div>
      );
    },
  },

  // ── APPLE PAGES INSPIRED ─────────────────────────────────────────────────
  {
    id: "cover-letter-minimal",
    title: "Minimalist Cover Letter",
    subtitle: "Elegant & well-spaced",
    type: "text",
    category: "Creative",
    content: {
      html: `<div style="max-width:680px;margin:0 auto;padding:72px 64px;font-family:'Georgia',serif;background:#fafaf9;min-height:900px">
  <div style="border-bottom:2px solid #1a1a2e;padding-bottom:24px;margin-bottom:40px">
    <h1 style="font-size:36px;font-weight:400;letter-spacing:-1px;color:#1a1a2e;margin:0 0 4px">J. DOE</h1>
    <p style="color:#6b7280;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0">Product Designer &amp; Strategist</p>
  </div>
  <div style="display:flex;gap:48px;margin-bottom:48px">
    <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.8">contact@johndoe.com<br/>+45 12 34 56 78<br/>johndoe.com</p>
    <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.8">${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
  </div>
  <p style="color:#374151;font-size:14px;line-height:1.9;margin:0 0 24px">To the Hiring Manager,</p>
  <p style="color:#374151;font-size:14px;line-height:1.9;margin:0 0 20px">Begin your application here. Lead with your strongest quality and connect it directly to what the company needs. Make this paragraph impossible to skip.</p>
  <p style="color:#374151;font-size:14px;line-height:1.9;margin:0 0 20px">In your second paragraph, demonstrate your specific value. Use a concrete example or achievement that proves your claim. Numbers and outcomes work best here.</p>
  <p style="color:#374151;font-size:14px;line-height:1.9;margin:0 0 48px">Close with a clear call to action. Express genuine enthusiasm for the role and invite next steps.</p>
  <p style="color:#374151;font-size:14px;margin:0 0 32px">Yours sincerely,</p>
  <p style="color:#1a1a2e;font-size:16px;font-weight:600;letter-spacing:-0.5px;margin:0">J. Doe</p>
</div>`,
    },
    thumbnail: (isDark) => {
      const bg = isDark ? "#1e293b" : "#fafaf9";
      const textCol = isDark ? "#94a3b8" : "#374151";
      const accent = isDark ? "#e2e8f0" : "#1a1a2e";
      return (
        <div className="w-full h-full flex flex-col px-4 py-4" style={{ background: bg }}>
          <div style={{ borderBottom: `1.5px solid ${accent}`, paddingBottom: 6, marginBottom: 8 }}>
            <div className="w-16 h-2.5 rounded-sm" style={{ background: accent }} />
            <div className="w-10 h-1 rounded-full mt-1" style={{ background: textCol, opacity: 0.4 }} />
          </div>
          <div className="flex gap-4 mb-4">
            {[0, 1].map(i => (
              <div key={i} className="flex flex-col gap-0.5">
                {[14, 18, 12].map((w, j) => (
                  <div key={j} className="h-0.5 rounded-full" style={{ width: w, background: textCol, opacity: 0.35 }} />
                ))}
              </div>
            ))}
          </div>
          {[100, 98, 92, 100, 96, 88, 100, 90, 60].map((w, i) => (
            <div key={i} className="h-0.5 rounded-full mb-1" style={{ width: `${w}%`, background: textCol, opacity: 0.3 }} />
          ))}
          <div className="mt-3">
            <div className="w-14 h-0.5 rounded-full mb-1.5" style={{ background: textCol, opacity: 0.3 }} />
            <div className="w-10 h-1.5 rounded-sm" style={{ background: accent, opacity: 0.7 }} />
          </div>
        </div>
      );
    },
  },
  {
    id: "tech-case-study",
    title: "Tech Case Study",
    subtitle: "Dark-native, neon accents",
    type: "text",
    category: "Creative",
    content: {
      html: `<div style="background:#0f0c1a;color:#e2e8f0;font-family:system-ui,sans-serif;min-height:900px">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:48px 56px 40px">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 12px">CASE STUDY · Q3 2024</p>
    <h1 style="font-size:48px;font-weight:900;letter-spacing:-2px;margin:0 0 8px;line-height:1.1">SYSTEM<br/>MIGRATION</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:15px;margin:0">Zero-downtime monolith to microservices migration at scale</p>
  </div>
  <div style="padding:48px 56px">
    <div style="display:flex;gap:16px;margin-bottom:48px">
      <div style="flex:1;background:rgba(79,70,229,0.12);border:1px solid rgba(79,70,229,0.3);border-radius:12px;padding:20px;text-align:center"><p style="color:#818cf8;font-size:26px;font-weight:800;margin:0 0 4px">99.97%</p><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0">Uptime</p></div>
      <div style="flex:1;background:rgba(79,70,229,0.12);border:1px solid rgba(79,70,229,0.3);border-radius:12px;padding:20px;text-align:center"><p style="color:#818cf8;font-size:26px;font-weight:800;margin:0 0 4px">3.2M</p><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0">Req/day</p></div>
      <div style="flex:1;background:rgba(79,70,229,0.12);border:1px solid rgba(79,70,229,0.3);border-radius:12px;padding:20px;text-align:center"><p style="color:#818cf8;font-size:26px;font-weight:800;margin:0 0 4px">-62%</p><p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0">Latency</p></div>
    </div>
    <h2 style="color:#a78bfa;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px">Executive Summary</h2>
    <p style="color:#94a3b8;line-height:1.8;margin:0 0 32px">Replace with your project abstract. Describe the challenge, the approach, and the outcome.</p>
    <h2 style="color:#a78bfa;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px">Architecture</h2>
    <div style="background:#0a0814;border:1px solid rgba(79,70,229,0.2);border-radius:8px;padding:20px;margin-bottom:32px;font-family:monospace;font-size:13px;color:#a78bfa">
// services: [auth, api, worker, db, cache]<br/>// deployment: kubernetes + helm
    </div>
    <h2 style="color:#a78bfa;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px">Outcome</h2>
    <p style="color:#94a3b8;line-height:1.8;margin:0">Describe the measurable results and what was learned.</p>
  </div>
</div>`,
    },
    thumbnail: (_isDark) => {
      return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "#0f0c1a" }}>
          <div className="px-3 py-3 flex flex-col gap-1" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            <div className="w-8 h-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.35)" }} />
            <div className="w-16 h-2.5 rounded-sm" style={{ background: "rgba(255,255,255,0.9)" }} />
            <div className="w-20 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
          </div>
          <div className="flex gap-1 px-2.5 py-2">
            {["99.97%", "3.2M", "−62%"].map((v, i) => (
              <div key={i} className="flex-1 rounded py-1 flex flex-col items-center gap-0.5"
                style={{ background: "rgba(79,70,229,0.12)", border: "0.5px solid rgba(79,70,229,0.3)" }}>
                <div className="text-[5px] font-bold" style={{ color: "#818cf8" }}>{v}</div>
                <div className="w-4 h-0.5 rounded-full" style={{ background: "#4f46e5", opacity: 0.4 }} />
              </div>
            ))}
          </div>
          <div className="px-2.5 flex flex-col gap-1">
            <div className="w-8 h-0.5 rounded-full" style={{ background: "#a78bfa", opacity: 0.6 }} />
            {[100, 85, 70].map((w, i) => (
              <div key={i} className="h-0.5 rounded-full" style={{ width: `${w}%`, background: "#334155" }} />
            ))}
            <div className="rounded mt-1 p-1.5" style={{ background: "#0a0814", border: "0.5px solid rgba(79,70,229,0.2)" }}>
              {[70, 55, 45].map((w, i) => (
                <div key={i} className="h-0.5 rounded-full mb-0.5" style={{ width: `${w}%`, background: "#4f46e5", opacity: 0.6 }} />
              ))}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "academic-paper-twocol",
    title: "Academic Paper",
    subtitle: "Two-column formal layout",
    type: "text",
    category: "Basic",
    content: {
      html: `<div style="max-width:800px;margin:0 auto;font-family:'Georgia',serif;padding:48px 40px;background:#ffffff;min-height:900px">
  <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e7eb">
    <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 8px;line-height:1.3">The Impact of Artificial Intelligence on User Interface Design</h1>
    <p style="color:#6b7280;font-size:13px;margin:0 0 4px">Author Name · Department of Computer Science</p>
    <p style="color:#9ca3af;font-size:12px;margin:0">University of Technology · ${new Date().getFullYear()}</p>
  </div>
  <div style="background:#f9fafb;border-left:3px solid #6366f1;padding:16px 20px;margin-bottom:32px;border-radius:0 8px 8px 0">
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6366f1;margin:0 0 6px">Abstract</p>
    <p style="font-size:13px;color:#374151;line-height:1.7;margin:0">Replace with your abstract text. Concise overview of research, methodology, and key findings in 150-250 words.</p>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px">
    <div>
      <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">1. Introduction</h2>
      <p style="font-size:13px;color:#4b5563;line-height:1.8;margin:0 0 16px">Start your introduction here. Establish context, state the problem, and outline your argument.</p>
      <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">2. Methodology</h2>
      <p style="font-size:13px;color:#4b5563;line-height:1.8;margin:0">Describe your research methods, sample size, data collection approach, and analytical framework.</p>
    </div>
    <div>
      <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">3. Results</h2>
      <p style="font-size:13px;color:#4b5563;line-height:1.8;margin:0 0 16px">Present your findings here. Use clear, factual language. Reference figures and tables where applicable.</p>
      <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:0 0 12px">4. Discussion</h2>
      <p style="font-size:13px;color:#4b5563;line-height:1.8;margin:0">Interpret your results. Compare with existing literature and explain implications of your findings.</p>
    </div>
  </div>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb">
    <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#374151;margin:0 0 8px">References</h2>
    <p style="font-size:12px;color:#6b7280;line-height:1.8;margin:0">[1] Author, A. B. (2023). Title of paper. <em>Journal Name</em>, 12(3), 45-67.</p>
  </div>
</div>`,
    },
    thumbnail: (isDark) => {
      const bg = isDark ? "#1e293b" : "#ffffff";
      const heading = isDark ? "#e2e8f0" : "#111827";
      const line = isDark ? "#334155" : "#e5e7eb";
      const body = isDark ? "#475569" : "#9ca3af";
      return (
        <div className="w-full h-full flex flex-col px-3 py-3" style={{ background: bg }}>
          <div className="flex flex-col items-center gap-0.5 pb-2 mb-2" style={{ borderBottom: `1px solid ${line}` }}>
            <div className="w-3/4 h-1.5 rounded-full" style={{ background: heading }} />
            <div className="w-2/3 h-1.5 rounded-full" style={{ background: heading, opacity: 0.7 }} />
            <div className="w-1/2 h-1 rounded-full mt-0.5" style={{ background: body }} />
          </div>
          <div className="px-1.5 py-1.5 mb-2 rounded-r" style={{ background: isDark ? "rgba(99,102,241,0.1)" : "#f9fafb", borderLeft: "2px solid #6366f1" }}>
            {[100, 90, 75].map((w, i) => (
              <div key={i} className="h-0.5 rounded-full mb-0.5" style={{ width: `${w}%`, background: body }} />
            ))}
          </div>
          <div className="flex gap-2 flex-1">
            {[0, 1].map(col => (
              <div key={col} className="flex-1 flex flex-col gap-0.5">
                <div className="w-full h-1 rounded-full mb-0.5" style={{ background: heading, opacity: 0.5 }} />
                {[100, 85, 70, 100, 80].map((w, i) => (
                  <div key={i} className="h-0.5 rounded-full" style={{ width: `${w}%`, background: body }} />
                ))}
                <div className="w-full h-0.5 my-1" style={{ background: line }} />
                <div className="w-3/4 h-1 rounded-full mb-0.5" style={{ background: heading, opacity: 0.5 }} />
                {[100, 75, 90].map((w, i) => (
                  <div key={i} className="h-0.5 rounded-full" style={{ width: `${w}%`, background: body }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    id: "mood-board",
    title: "Creative Mood Board",
    subtitle: "Masonry layout & bold impact",
    type: "text",
    category: "Creative",
    content: {
      entities: [
        { id: "mb-bg",       type: "rect",    position: { x: 0,   y: 0   }, size: { w: 794, h: 1120 }, style: { fill: "#0a0a0a",   stroke: "transparent", strokeWidth: 0, borderRadius: 0,  opacity: 1 }, content: "", zIndex: 1 },
        { id: "mb-title",    type: "textBox", position: { x: 200, y: 60  }, size: { w: 400, h: 80   }, style: { fill: "transparent", stroke: "#ffffff",   strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "VISION BOARD", zIndex: 10 },
        { id: "mb-subtitle", type: "textBox", position: { x: 260, y: 148 }, size: { w: 280, h: 28   }, style: { fill: "transparent", stroke: "#f59e0b",   strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "BRAND IDENTITY · 2025", zIndex: 10 },
        { id: "mb-hero",     type: "rect",    position: { x: 40,  y: 200  }, size: { w: 460, h: 280  }, style: { fill: "#1c1c2e",    stroke: "rgba(255,255,255,0.15)", strokeWidth: 1, borderRadius: 16, opacity: 1 }, content: "", zIndex: 2 },
        { id: "mb-block1",   type: "rect",    position: { x: 520, y: 200  }, size: { w: 234, h: 130  }, style: { fill: "#f59e0b",    stroke: "transparent", strokeWidth: 0, borderRadius: 12, opacity: 1 }, content: "", zIndex: 2 },
        { id: "mb-block2",   type: "rect",    position: { x: 520, y: 350  }, size: { w: 234, h: 130  }, style: { fill: "#6366f1",    stroke: "transparent", strokeWidth: 0, borderRadius: 12, opacity: 1 }, content: "", zIndex: 2 },
        { id: "mb-circle1",  type: "circle",  position: { x: 40,  y: 510  }, size: { w: 80,  h: 80   }, style: { fill: "#f59e0b",    stroke: "transparent", strokeWidth: 0, borderRadius: 50, opacity: 1 }, content: "", zIndex: 3 },
        { id: "mb-circle2",  type: "circle",  position: { x: 140, y: 510  }, size: { w: 80,  h: 80   }, style: { fill: "#ef4444",    stroke: "transparent", strokeWidth: 0, borderRadius: 50, opacity: 1 }, content: "", zIndex: 3 },
        { id: "mb-circle3",  type: "circle",  position: { x: 240, y: 510  }, size: { w: 80,  h: 80   }, style: { fill: "#6366f1",    stroke: "transparent", strokeWidth: 0, borderRadius: 50, opacity: 1 }, content: "", zIndex: 3 },
        { id: "mb-circle4",  type: "circle",  position: { x: 340, y: 510  }, size: { w: 80,  h: 80   }, style: { fill: "#0f172a",    stroke: "rgba(255,255,255,0.15)", strokeWidth: 1, borderRadius: 50, opacity: 1 }, content: "", zIndex: 3 },
        { id: "mb-circle5",  type: "circle",  position: { x: 440, y: 510  }, size: { w: 80,  h: 80   }, style: { fill: "#f8fafc",    stroke: "transparent", strokeWidth: 0, borderRadius: 50, opacity: 1 }, content: "", zIndex: 3 },
        { id: "mb-pal-lbl",  type: "textBox", position: { x: 40,  y: 614  }, size: { w: 120, h: 24   }, style: { fill: "transparent", stroke: "#f59e0b",   strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "PALETTE", zIndex: 10 },
        { id: "mb-typo",     type: "rect",    position: { x: 40,  y: 660  }, size: { w: 220, h: 100  }, style: { fill: "#1c1c2e",    stroke: "rgba(255,255,255,0.07)", strokeWidth: 1, borderRadius: 12, opacity: 1 }, content: "", zIndex: 2 },
        { id: "mb-typo-lbl", type: "textBox", position: { x: 56,  y: 680  }, size: { w: 180, h: 24   }, style: { fill: "transparent", stroke: "#6366f1",   strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "TYPOGRAPHY", zIndex: 10 },
        { id: "mb-aa",       type: "textBox", position: { x: 56,  y: 710  }, size: { w: 80,  h: 40   }, style: { fill: "transparent", stroke: "#ffffff",   strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "Aa", zIndex: 10 },
        { id: "mb-tone",     type: "rect",    position: { x: 280, y: 660  }, size: { w: 220, h: 100  }, style: { fill: "#1c1c2e",    stroke: "rgba(255,255,255,0.07)", strokeWidth: 1, borderRadius: 12, opacity: 1 }, content: "", zIndex: 2 },
        { id: "mb-tone-lbl", type: "textBox", position: { x: 296, y: 680  }, size: { w: 180, h: 24   }, style: { fill: "transparent", stroke: "#ef4444",   strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "TONE", zIndex: 10 },
        { id: "mb-tone-val", type: "textBox", position: { x: 296, y: 710  }, size: { w: 180, h: 40   }, style: { fill: "transparent", stroke: "#9ca3af",   strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "Bold. Minimal. Impactful.", zIndex: 10 },
      ],
    },
    thumbnail: (_isDark) => {
      return (
        <div className="w-full h-full flex flex-col" style={{ background: "#0a0a0a" }}>
          <div className="flex flex-col items-center justify-center py-2.5">
            <div className="w-16 h-3 rounded-sm" style={{ background: "white", opacity: 0.9 }} />
            <div className="w-12 h-2.5 rounded-sm mt-0.5" style={{ background: "#f59e0b" }} />
            <div className="w-8 h-0.5 rounded-full mt-1" style={{ background: "rgba(255,255,255,0.3)" }} />
          </div>
          <div className="flex gap-1 px-2 flex-1">
            <div className="flex-[2] rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1c1c2e,#2d1b4e)", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <div className="w-3 h-3 rounded opacity-30" style={{ background: "white" }} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 rounded-lg" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }} />
              <div className="flex-1 rounded-lg" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} />
            </div>
          </div>
          <div className="flex gap-0.5 justify-center py-1.5">
            {["#f59e0b","#ef4444","#6366f1","#0f172a","#f8fafc"].map(c => (
              <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
            ))}
          </div>
          {/* Canvas mode badge */}
          <div className="flex justify-center pb-1.5">
            <div className="px-1.5 py-0.5 rounded text-[4px] font-bold" style={{ background: "rgba(99,102,241,0.3)", color: "#a5b4fc", border: "0.5px solid rgba(99,102,241,0.5)" }}>
              CANVAS MODE
            </div>
          </div>
        </div>
      );
    },
  },

  // ── CRM & SALES ──────────────────────────────────────────────────────────
  {
    id: "project-budget",
    title: "Project Budget",
    subtitle: "Green header, alternating rows",
    type: "spreadsheet",
    category: "Business & Finance",
    content: {
      rows: [
        ["Category", "Expected ($)", "Actual ($)", "Variance ($)"],
        ["Design & Branding", "5,000", "4,200", "800"],
        ["Development", "25,000", "27,500", "-2,500"],
        ["Marketing", "8,000", "7,100", "900"],
        ["Infrastructure", "3,000", "3,400", "-400"],
        ["Legal & Compliance", "2,500", "2,200", "300"],
        ["Contingency (10%)", "4,350", "0", "4,350"],
        ["", "", "", ""],
        ["TOTAL", "47,850", "44,400", "3,450"],
      ],
      cellFormats: {
        "0-0": { bold: true, background: "#059669", color: "#ffffff" },
        "0-1": { bold: true, background: "#059669", color: "#ffffff" },
        "0-2": { bold: true, background: "#059669", color: "#ffffff" },
        "0-3": { bold: true, background: "#059669", color: "#ffffff" },
        "8-0": { bold: true, background: "#dc2626", color: "#ffffff" },
        "8-1": { bold: true, background: "#dc2626", color: "#ffffff" },
        "8-2": { bold: true, background: "#dc2626", color: "#ffffff" },
        "8-3": { bold: true, background: "#dc2626", color: "#ffffff" },
      },
    },
    thumbnail: (isDark) => {
      const mainBg = isDark ? "#1e293b" : "#ffffff";
      const altRow = isDark ? "#0f2a1e" : "#f0fdf4";
      const greenBg = "#059669";
      const redBg = "#dc2626";
      const rows = ["Design", "Development", "Marketing", "Infrastructure", "Legal"];
      return (
        <div className="w-full h-full flex flex-col" style={{ background: mainBg }}>
          <div className="flex gap-0.5 px-1.5 py-1.5" style={{ background: greenBg }}>
            {["Category", "Expected", "Actual", "Var"].map((h, i) => (
              <div key={i} className="flex-1 text-[3.5px] font-bold" style={{ color: "white" }}>{h}</div>
            ))}
          </div>
          {rows.map((label, i) => (
            <div key={i} className="flex gap-0.5 px-1.5 py-0.5" style={{ background: i % 2 === 0 ? mainBg : altRow, borderBottom: `0.5px solid ${isDark ? "#334155" : "#d1fae5"}` }}>
              <div className="flex-1 text-[3px]" style={{ color: isDark ? "#94a3b8" : "#374151" }}>{label}</div>
              {["$X,XXX", "$X,XXX", "+/-"].map((v, j) => (
                <div key={j} className="flex-1 text-[3px]" style={{ color: isDark ? "#64748b" : "#6b7280" }}>{v}</div>
              ))}
            </div>
          ))}
          <div className="flex gap-0.5 px-1.5 py-1 mt-auto" style={{ background: redBg }}>
            {["TOTAL", "$47,850", "$44,400", "$3,450"].map((v, i) => (
              <div key={i} className="flex-1 text-[3.5px] font-bold" style={{ color: "white" }}>{v}</div>
            ))}
          </div>
        </div>
      );
    },
  },
  // ── NOTES & MEETINGS – Missing entries ────────────────────────────────
  {
    id: "meeting-minutes-pro",
    title: "Meeting Minutes Pro",
    subtitle: "Formal boardroom record",
    type: "text",
    category: "Notes & Meetings",
    content: {
      html: `<div style="max-width:760px;margin:0 auto;font-family:system-ui,sans-serif;padding:40px 48px;background:#fff;min-height:900px">
  <div style="border-bottom:4px solid #0f172a;padding-bottom:20px;margin-bottom:28px">
    <h1 style="font-size:32px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;margin:0 0 12px;color:#0f172a">Meeting Minutes</h1>
    <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#64748b">
      <span>Date: ${new Date().toLocaleDateString()}</span>
      <span>Time: 10:00 AM</span>
      <span>Location: Boardroom A</span>
    </div>
  </div>
  <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div><p style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;margin:0 0 4px">Facilitator</p><p style="font-size:14px;font-weight:600;color:#1e293b;margin:0">[Name]</p></div>
    <div><p style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;margin:0 0 4px">Note Taker</p><p style="font-size:14px;font-weight:600;color:#1e293b;margin:0">[Name]</p></div>
  </div>
  <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;background:#f1f5f9;padding:8px 12px;border-radius:4px;color:#334155;margin:0 0 12px">1. Attendees</h2>
  <ul style="font-size:14px;color:#475569;line-height:2;margin:0 0 24px;padding-left:20px"><li>Attendee 1</li><li>Attendee 2</li><li>Attendee 3</li></ul>
  <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;background:#f1f5f9;padding:8px 12px;border-radius:4px;color:#334155;margin:0 0 12px">2. Discussion</h2>
  <p style="font-size:14px;color:#475569;line-height:1.8;margin:0 0 24px">Key discussion points go here...</p>
  <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;background:#f1f5f9;padding:8px 12px;border-radius:4px;color:#334155;margin:0 0 12px">3. Action Items</h2>
  <div style="border-left:3px solid #ef4444;padding:12px 16px;background:#fff5f5;border-radius:0 6px 6px 0;margin-bottom:8px"><p style="font-weight:700;color:#1e293b;margin:0 0 4px">Task: Finalize Q3 Budget</p><p style="font-size:12px;color:#64748b;margin:0">Owner: Finance | Due: Friday</p></div>
  <div style="border-left:3px solid #3b82f6;padding:12px 16px;background:#eff6ff;border-radius:0 6px 6px 0;margin-bottom:24px"><p style="font-weight:700;color:#1e293b;margin:0 0 4px">Task: Send client proposal</p><p style="font-size:12px;color:#64748b;margin:0">Owner: Sales | Due: Next Monday</p></div>
  <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;background:#f1f5f9;padding:8px 12px;border-radius:4px;color:#334155;margin:0 0 12px">4. Next Meeting</h2>
  <p style="font-size:14px;color:#475569;margin:0">Date &amp; Time: ___________</p>
</div>`,
    },
    thumbnail: (isDark) => {
      const bg = isDark ? "#1e293b" : "#fff";
      const hdr = isDark ? "#e2e8f0" : "#0f172a";
      const line = isDark ? "#334155" : "#e2e8f0";
      const subtle = isDark ? "#475569" : "#f1f5f9";
      const red = isDark ? "rgba(239,68,68,0.3)" : "#fee2e2";
      const blue = isDark ? "rgba(59,130,246,0.2)" : "#dbeafe";
      return (
        <div className="w-full h-full flex flex-col px-3 pt-2.5 pb-2 gap-1" style={{ background: bg }}>
          <div className="w-3/4 h-2.5 rounded-sm" style={{ background: hdr }} />
          <div className="w-full h-px mb-1" style={{ background: hdr, opacity: 0.8 }} />
          <div className="flex gap-2 mb-1">
            {[0,1].map(i=><div key={i} className="flex-1 h-4 rounded" style={{background:subtle}}/>)}
          </div>
          <div className="w-2/5 h-1.5 rounded" style={{background:subtle}}/>
          {[1,2,3].map(i=><div key={i} className="flex items-center gap-1"><div className="w-1 h-1 rounded-full" style={{background:isDark?"#64748b":"#94a3b8"}}/><div className="h-1 rounded-full" style={{background:line,width:`${40+i*12}%`}}/></div>)}
          <div className="w-full h-px my-1" style={{background:line}}/>
          <div className="h-4 rounded-r px-2 flex items-center" style={{background:red,borderLeft:`2px solid #ef4444`}}>
            <div className="h-1 w-2/3 rounded-full" style={{background:isDark?"#ef4444":"#fca5a5"}}/>
          </div>
          <div className="h-4 rounded-r px-2 flex items-center" style={{background:blue,borderLeft:`2px solid #3b82f6`}}>
            <div className="h-1 w-1/2 rounded-full" style={{background:isDark?"#3b82f6":"#93c5fd"}}/>
          </div>
        </div>
      );
    },
  },
  {
    id: "project-proposal-pro",
    title: "Project Proposal",
    subtitle: "Dark hero, editorial layout",
    type: "text",
    category: "Project Management",
    content: {
      html: `<div style="max-width:800px;min-height:900px;margin:0 auto;font-family:system-ui,sans-serif;background:#f8fafc">
  <div style="height:240px;background:#0f172a;padding:48px;display:flex;flex-direction:column;justify-content:flex-end">
    <p style="color:#4ade80;font-family:monospace;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px">PROPOSAL DOCUMENT</p>
    <h1 style="font-size:52px;font-weight:900;letter-spacing:-2px;color:white;line-height:0.95;margin:0">PROJECT<br/>ALPHA</h1>
  </div>
  <div style="padding:48px">
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:0;margin-bottom:40px;border-top:1px solid #e2e8f0;padding-top:20px">
      <p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin:0">Prepared For</p>
      <p style="font-size:15px;font-weight:500;color:#0f172a;font-family:Georgia,serif;margin:0">Board of Directors, Acme Corp</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:0;margin-bottom:40px;border-top:1px solid #e2e8f0;padding-top:20px">
      <p style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin:0">Date</p>
      <p style="font-size:15px;font-weight:500;color:#0f172a;font-family:Georgia,serif;margin:0">${new Date().toLocaleDateString()}</p>
    </div>
    <h2 style="font-size:26px;font-weight:800;color:#0f172a;margin:0 0 12px;letter-spacing:-0.5px">1. Objective</h2>
    <p style="font-size:14px;color:#475569;line-height:1.9;margin:0 0 32px">Replace this with your project goals. Be specific about the outcomes, timeline, and success criteria.</p>
    <h2 style="font-size:26px;font-weight:800;color:#0f172a;margin:0 0 12px;letter-spacing:-0.5px">2. Solution</h2>
    <p style="font-size:14px;color:#475569;line-height:1.9;margin:0 0 32px">Explain your proposed approach and methodology here...</p>
    <h2 style="font-size:26px;font-weight:800;color:#0f172a;margin:0 0 12px;letter-spacing:-0.5px">3. Budget &amp; Timeline</h2>
    <p style="font-size:14px;color:#475569;line-height:1.9;margin:0">Add milestones, key dates, and estimated investment...</p>
  </div>
</div>`,
    },
    thumbnail: (isDark) => {
      const bg = isDark ? "#f8fafc" : "#f8fafc";
      return (
        <div className="w-full h-full flex flex-col overflow-hidden" style={{background:bg}}>
          <div className="flex flex-col justify-end pb-2 px-3" style={{height:"42%",background:"#0f172a"}}>
            <div className="w-12 h-0.5 rounded-full mb-1" style={{background:"#4ade80",opacity:0.8}}/>
            <div className="w-16 h-2.5 rounded-sm" style={{background:"rgba(255,255,255,0.85)"}}/>
            <div className="w-12 h-2 rounded-sm mt-0.5" style={{background:"rgba(255,255,255,0.65)"}}/>
          </div>
          <div className="flex-1 px-3 pt-2 flex flex-col gap-1.5">
            {[["Prepared For","Board of Directors"],["Date",new Date().toLocaleDateString()]].map(([k,v],i)=>(
              <div key={i} className="flex gap-2 pb-1" style={{borderBottom:"0.5px solid #e2e8f0"}}>
                <div className="w-12 h-1 rounded-full" style={{background:"#94a3b8"}}/>
                <div className="flex-1 h-1 rounded-full" style={{background:"#334155"}}/>
              </div>
            ))}
            <div className="w-2/3 h-1.5 rounded-full mt-1" style={{background:"#0f172a"}}/>
            {[100,100,80,100,90].map((w,i)=><div key={i} className="h-1 rounded-full" style={{background:"#e2e8f0",width:`${w}%`}}/>)}
          </div>
        </div>
      );
    },
  },

  // ── SPRINT PLANNING spreadsheet ────────────────────────────────────────
  {
    id: "sprint-planning",
    title: "Sprint Planning",
    subtitle: "Agile task board with status",
    type: "spreadsheet",
    category: "Project Management",
    content: {
      rows: [
        ["Task ID", "Task", "Priority", "Assignee", "Status", "Est. Hours"],
        ["SP-001", "Design system audit", "High", "Alice M.", "In Progress", "8"],
        ["SP-002", "API endpoint refactor", "High", "Bob T.", "To Do", "12"],
        ["SP-003", "Unit test coverage", "Medium", "Carol S.", "In Progress", "6"],
        ["SP-004", "Onboarding flow redesign", "Medium", "Alice M.", "To Do", "10"],
        ["SP-005", "Database migration", "Low", "David L.", "Done", "4"],
        ["SP-006", "Performance audit", "Low", "Eva K.", "To Do", "5"],
      ],
      cellFormats: {
        "0-0": { bold: true, background: "#1e293b", color: "#f8fafc" },
        "0-1": { bold: true, background: "#1e293b", color: "#f8fafc" },
        "0-2": { bold: true, background: "#1e293b", color: "#f8fafc" },
        "0-3": { bold: true, background: "#1e293b", color: "#f8fafc" },
        "0-4": { bold: true, background: "#1e293b", color: "#f8fafc" },
        "0-5": { bold: true, background: "#1e293b", color: "#f8fafc" },
        "1-2": { background: "#fef2f2", color: "#dc2626", bold: true },
        "2-2": { background: "#fef2f2", color: "#dc2626", bold: true },
        "3-2": { background: "#fffbeb", color: "#d97706", bold: true },
        "4-2": { background: "#fffbeb", color: "#d97706", bold: true },
        "5-2": { background: "#f0fdf4", color: "#16a34a", bold: true },
        "6-2": { background: "#f0fdf4", color: "#16a34a", bold: true },
        "1-4": { background: "#eff6ff", color: "#2563eb" },
        "3-4": { background: "#eff6ff", color: "#2563eb" },
        "5-4": { background: "#f0fdf4", color: "#16a34a", bold: true },
      },
    },
    thumbnail: (isDark) => {
      const bg = isDark ? "#1e293b" : "#fff";
      const rows = [
        { task: "Design audit", pri: "High", priC: "#dc2626", priB: isDark?"rgba(220,38,38,0.15)":"#fef2f2", status: "In Progress", stC: "#2563eb", stB: isDark?"rgba(37,99,235,0.15)":"#eff6ff" },
        { task: "API refactor", pri: "High", priC: "#dc2626", priB: isDark?"rgba(220,38,38,0.15)":"#fef2f2", status: "To Do", stC: "#64748b", stB: isDark?"#1e293b":"#f8fafc" },
        { task: "Unit tests", pri: "Med", priC: "#d97706", priB: isDark?"rgba(217,119,6,0.15)":"#fffbeb", status: "In Progress", stC: "#2563eb", stB: isDark?"rgba(37,99,235,0.15)":"#eff6ff" },
        { task: "DB migration", pri: "Low", priC: "#16a34a", priB: isDark?"rgba(22,163,74,0.15)":"#f0fdf4", status: "Done", stC: "#16a34a", stB: isDark?"rgba(22,163,74,0.15)":"#f0fdf4" },
      ];
      return (
        <div className="w-full h-full flex flex-col" style={{background:bg}}>
          <div className="flex px-1.5 py-1 gap-0.5" style={{background:"#1e293b",borderBottom:"1px solid #334155"}}>
            {["ID","Task","Pri","Status","Hrs"].map((h,i)=>(
              <div key={i} className={`text-[3.5px] font-bold ${i===1?"flex-[2]":"flex-1"}`} style={{color:"#94a3b8"}}>{h}</div>
            ))}
          </div>
          {rows.map((r,i)=>(
            <div key={i} className="flex px-1.5 py-0.5 gap-0.5 items-center" style={{borderBottom:`0.5px solid ${isDark?"#334155":"#e2e8f0"}`}}>
              <div className="flex-1 text-[3px]" style={{color:isDark?"#64748b":"#94a3b8"}}>{`SP-00${i+1}`}</div>
              <div className="flex-[2] text-[3px] truncate" style={{color:isDark?"#cbd5e1":"#374151"}}>{r.task}</div>
              <div className="flex-1 flex">
                <div className="px-0.5 rounded text-[3px] font-bold" style={{background:r.priB,color:r.priC}}>{r.pri}</div>
              </div>
              <div className="flex-1 flex">
                <div className="px-0.5 rounded text-[3px]" style={{background:r.stB,color:r.stC}}>{r.status.split(" ")[0]}</div>
              </div>
              <div className="flex-1 text-[3px]" style={{color:isDark?"#475569":"#94a3b8"}}>—</div>
            </div>
          ))}
        </div>
      );
    },
  },

  // ── QUARTERLY BUDGET spreadsheet ─────────────────────────────────────────
  {
    id: "quarterly-budget",
    title: "Quarterly Budget",
    subtitle: "Q1–Q4 planning with totals",
    type: "spreadsheet",
    category: "Business & Finance",
    content: {
      rows: [
        ["Category", "Q1 ($)", "Q2 ($)", "Q3 ($)", "Q4 ($)", "Total ($)"],
        ["Marketing", "12,000", "15,000", "18,000", "22,000", "67,000"],
        ["Salaries", "45,000", "45,000", "47,500", "47,500", "185,000"],
        ["Operations", "8,500", "8,500", "9,000", "9,500", "35,500"],
        ["Infrastructure", "3,200", "3,200", "3,500", "3,500", "13,400"],
        ["Travel", "2,000", "1,500", "3,500", "2,000", "9,000"],
        ["Training", "1,800", "1,200", "1,800", "1,200", "6,000"],
        ["", "", "", "", "", ""],
        ["TOTAL", "72,500", "74,400", "83,300", "85,700", "315,900"],
      ],
      cellFormats: {
        "0-0": { bold: true, background: "#1e3a5f", color: "#e0f2fe" },
        "0-1": { bold: true, background: "#1e3a5f", color: "#e0f2fe" },
        "0-2": { bold: true, background: "#1e3a5f", color: "#e0f2fe" },
        "0-3": { bold: true, background: "#1e3a5f", color: "#e0f2fe" },
        "0-4": { bold: true, background: "#1e3a5f", color: "#e0f2fe" },
        "0-5": { bold: true, background: "#1e3a5f", color: "#e0f2fe" },
        "8-0": { bold: true, background: "#0f4c2a", color: "#dcfce7" },
        "8-1": { bold: true, background: "#0f4c2a", color: "#dcfce7" },
        "8-2": { bold: true, background: "#0f4c2a", color: "#dcfce7" },
        "8-3": { bold: true, background: "#0f4c2a", color: "#dcfce7" },
        "8-4": { bold: true, background: "#0f4c2a", color: "#dcfce7" },
        "8-5": { bold: true, background: "#0f4c2a", color: "#dcfce7" },
      },
    },
    thumbnail: (isDark) => {
      const bg = isDark ? "#1e293b" : "#fff";
      const navy = "#1e3a5f";
      const green = "#0f4c2a";
      const rowBg = isDark ? "#0f172a" : "#f8fafc";
      const altBg = isDark ? "#1e293b" : "#fff";
      return (
        <div className="w-full h-full flex flex-col" style={{background:bg}}>
          <div className="flex px-1.5 py-1 gap-0.5" style={{background:navy}}>
            {["Category","Q1","Q2","Q3","Q4","Total"].map((h,i)=>(
              <div key={i} className={`text-[3px] font-bold ${i===0?"flex-[2]":"flex-1"}`} style={{color:"#bae6fd"}}>{h}</div>
            ))}
          </div>
          {["Marketing","Salaries","Operations","Infrastr.","Travel","Training"].map((cat,i)=>(
            <div key={i} className="flex px-1.5 py-0.5 gap-0.5" style={{background:i%2===0?altBg:rowBg,borderBottom:`0.5px solid ${isDark?"#334155":"#e2e8f0"}`}}>
              <div className="flex-[2] text-[3px]" style={{color:isDark?"#cbd5e1":"#374151"}}>{cat}</div>
              {[0,1,2,3,4].map(j=>(
                <div key={j} className="flex-1 text-[3px] text-right" style={{color:isDark?"#64748b":"#94a3b8"}}>–</div>
              ))}
            </div>
          ))}
          <div className="flex px-1.5 py-1 gap-0.5 mt-auto" style={{background:green}}>
            {["TOTAL","72.5k","74.4k","83.3k","85.7k","315.9k"].map((v,i)=>(
              <div key={i} className={`text-[3px] font-bold ${i===0?"flex-[2]":"flex-1 text-right"}`} style={{color:"#bbf7d0"}}>{v}</div>
            ))}
          </div>
        </div>
      );
    },
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
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full flex flex-col" style={{ background: c.paper }}>
          <div className="flex px-2 py-1 gap-1" style={{ borderBottom: `1.5px solid ${isDark ? "#10b981" : "#059669"}`, background: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.07)" }}>
            {["Contact", "Stage", "Value"].map((h, i) => (
              <div key={i} className="flex-1 text-[4px] font-bold" style={{ color: isDark ? "#34d399" : "#065f46" }}>{h}</div>
            ))}
          </div>
          {[
            ["S. Johnson", "Qualified", "$12.5k", "#3b82f6"],
            ["M. Chen", "Proposal", "$8.2k", "#f59e0b"],
            ["E. Rodriguez", "Negotiation", "$31k", "#f97316"],
            ["D. Kim", "Demo", "$5.7k", "#8b5cf6"],
            ["A. Müller", "✓ Closed", "$19.8k", "#10b981"],
          ].map((row, i) => (
            <div key={i} className="flex px-2 py-0.5 gap-1" style={{ borderBottom: `1px solid ${c.line}` }}>
              {[0, 1, 2].map(j => (
                <div key={j} className="flex-1 text-[4px] truncate"
                  style={{ color: j === 1 ? row[3] : j === 0 ? c.textDark : c.muted, fontWeight: j === 0 ? 600 : 400 }}>
                  {row[j]}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    },
  },
  // ── CREATIVE MOOD BOARD (Canvas) ─────────────────────────────────────────
  {
    id: "creative-mood-board",
    title: "Creative Mood Board",
    subtitle: "Drag & drop visual canvas",
    type: "text",
    category: "Creative",
    content: {
      entities: [
        { id: "mb1", type: "rect",    position: { x: 40, y: 40 },   size: { w: 200, h: 120 }, style: { fill: "#7c3aed", stroke: "#5b21b6", strokeWidth: 0, borderRadius: 16, opacity: 0.9 }, content: "", zIndex: 1 },
        { id: "mb2", type: "circle",  position: { x: 280, y: 60 },  size: { w: 90,  h: 90  }, style: { fill: "#ec4899", stroke: "#be185d", strokeWidth: 0, borderRadius: 50, opacity: 1   }, content: "", zIndex: 2 },
        { id: "mb3", type: "rect",    position: { x: 400, y: 30 },  size: { w: 160, h: 80  }, style: { fill: "#0ea5e9", stroke: "#0369a1", strokeWidth: 0, borderRadius: 12, opacity: 0.85}, content: "", zIndex: 3 },
        { id: "mb4", type: "textBox", position: { x: 50, y: 200 },  size: { w: 220, h: 55  }, style: { fill: "transparent", stroke: "#f0abfc", strokeWidth: 1.5, borderRadius: 8, opacity: 1 }, content: "My Vision ✨", zIndex: 4 },
        { id: "mb5", type: "circle",  position: { x: 420, y: 160 }, size: { w: 130, h: 130 }, style: { fill: "#f59e0b", stroke: "#d97706", strokeWidth: 0, borderRadius: 50, opacity: 0.8 }, content: "", zIndex: 5 },
        { id: "mb6", type: "rect",    position: { x: 160, y: 290 }, size: { w: 180, h: 100 }, style: { fill: "#10b981", stroke: "#065f46", strokeWidth: 0, borderRadius: 20, opacity: 0.75}, content: "", zIndex: 6 },
        { id: "mb7", type: "textBox", position: { x: 370, y: 320 }, size: { w: 200, h: 50  }, style: { fill: "rgba(255,255,255,0.08)", stroke: "#e2e8f0", strokeWidth: 1, borderRadius: 8, opacity: 1 }, content: "Add your ideas here", zIndex: 7 },
      ],
    },
    thumbnail: (isDark) => {
      const c = p(isDark);
      return (
        <div className="w-full h-full relative overflow-hidden" style={{ background: isDark ? "#0f0a1e" : "#f8f4ff" }}>
          <div className="absolute rounded-xl" style={{ left: "5%",  top: "8%",  width: "38%", height: "30%", background: "#7c3aed", opacity: 0.85 }} />
          <div className="absolute rounded-full" style={{ left: "48%", top: "10%", width: "18%", height: "25%", background: "#ec4899" }} />
          <div className="absolute rounded-lg"  style={{ left: "68%", top: "6%",  width: "28%", height: "22%", background: "#0ea5e9", opacity: 0.85 }} />
          <div className="absolute rounded-full" style={{ left: "70%", top: "35%", width: "25%", height: "35%", background: "#f59e0b", opacity: 0.8 }} />
          <div className="absolute rounded-2xl" style={{ left: "25%", top: "60%", width: "32%", height: "28%", background: "#10b981", opacity: 0.75 }} />
          <div className="absolute rounded-md"  style={{ left: "6%",  top: "52%", width: "35%", height: "9%",  background: "transparent", border: "1.5px solid #f0abfc" }}>
            <span style={{ fontSize: 4, color: "#f0abfc", padding: "0 3px" }}>My Vision ✨</span>
          </div>
        </div>
      );
    },
  },

  // ── WIREFRAME PROTOTYPE (Canvas) ──────────────────────────────────────────
  {
    id: "wireframe-prototype",
    title: "Wireframe Prototype",
    subtitle: "App screen wireframe canvas",
    type: "text",
    category: "Creative",
    content: {
      entities: [
        // Screen frame
        { id: "wf-frame",    type: "rect",    position: { x: 30,  y: 20  }, size: { w: 320, h: 480 }, style: { fill: "transparent",      stroke: "#64748b", strokeWidth: 2, borderRadius: 12, opacity: 1 }, content: "", zIndex: 1 },
        // Nav bar
        { id: "wf-nav",      type: "rect",    position: { x: 30,  y: 20  }, size: { w: 320, h: 44  }, style: { fill: "#1e293b",           stroke: "#334155", strokeWidth: 1, borderRadius: 12, opacity: 1 }, content: "", zIndex: 2 },
        { id: "wf-nav-txt",  type: "textBox", position: { x: 130, y: 30  }, size: { w: 120, h: 24  }, style: { fill: "transparent",      stroke: "#94a3b8", strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "App Title", zIndex: 3 },
        // Hero banner
        { id: "wf-hero",     type: "rect",    position: { x: 50,  y: 80  }, size: { w: 280, h: 100 }, style: { fill: "#334155",           stroke: "#475569", strokeWidth: 1, borderRadius: 8,  opacity: 1 }, content: "", zIndex: 4 },
        { id: "wf-hero-txt", type: "textBox", position: { x: 90,  y: 110 }, size: { w: 200, h: 40  }, style: { fill: "transparent",      stroke: "#94a3b8", strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "Hero Image / Banner", zIndex: 5 },
        // Buttons
        { id: "wf-btn1",     type: "rect",    position: { x: 50,  y: 200 }, size: { w: 128, h: 36  }, style: { fill: "#3b82f6",           stroke: "#2563eb", strokeWidth: 0, borderRadius: 8,  opacity: 1 }, content: "", zIndex: 6 },
        { id: "wf-btn1t",    type: "textBox", position: { x: 68,  y: 208 }, size: { w: 92,  h: 20  }, style: { fill: "transparent",      stroke: "#ffffff", strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "Primary CTA", zIndex: 7 },
        { id: "wf-btn2",     type: "rect",    position: { x: 202, y: 200 }, size: { w: 128, h: 36  }, style: { fill: "transparent",      stroke: "#64748b", strokeWidth: 1, borderRadius: 8,  opacity: 1 }, content: "", zIndex: 8 },
        { id: "wf-btn2t",    type: "textBox", position: { x: 216, y: 208 }, size: { w: 100, h: 20  }, style: { fill: "transparent",      stroke: "#94a3b8", strokeWidth: 0, borderRadius: 4,  opacity: 1 }, content: "Secondary", zIndex: 9 },
        // Cards row
        { id: "wf-card1",    type: "rect",    position: { x: 50,  y: 260 }, size: { w: 80,  h: 80  }, style: { fill: "#1e293b",           stroke: "#334155", strokeWidth: 1, borderRadius: 8,  opacity: 1 }, content: "", zIndex: 10 },
        { id: "wf-card2",    type: "rect",    position: { x: 150, y: 260 }, size: { w: 80,  h: 80  }, style: { fill: "#1e293b",           stroke: "#334155", strokeWidth: 1, borderRadius: 8,  opacity: 1 }, content: "", zIndex: 11 },
        { id: "wf-card3",    type: "rect",    position: { x: 250, y: 260 }, size: { w: 80,  h: 80  }, style: { fill: "#1e293b",           stroke: "#334155", strokeWidth: 1, borderRadius: 8,  opacity: 1 }, content: "", zIndex: 12 },
        // Bottom tab bar
        { id: "wf-tabs",     type: "rect",    position: { x: 30,  y: 424 }, size: { w: 320, h: 56  }, style: { fill: "#1e293b",           stroke: "#334155", strokeWidth: 1, borderRadius: 0,  opacity: 1 }, content: "", zIndex: 13 },
        { id: "wf-tab1",     type: "circle",  position: { x: 75,  y: 440 }, size: { w: 24,  h: 24  }, style: { fill: "#3b82f6",           stroke: "#2563eb", strokeWidth: 0, borderRadius: 50, opacity: 1 }, content: "", zIndex: 14 },
        { id: "wf-tab2",     type: "circle",  position: { x: 175, y: 440 }, size: { w: 24,  h: 24  }, style: { fill: "#475569",           stroke: "#64748b", strokeWidth: 0, borderRadius: 50, opacity: 1 }, content: "", zIndex: 15 },
        { id: "wf-tab3",     type: "circle",  position: { x: 275, y: 440 }, size: { w: 24,  h: 24  }, style: { fill: "#475569",           stroke: "#64748b", strokeWidth: 0, borderRadius: 50, opacity: 1 }, content: "", zIndex: 16 },
      ],
    },
    thumbnail: (isDark) => (
      <div className="w-full h-full flex items-center justify-center" style={{ background: isDark ? "#0f172a" : "#f1f5f9" }}>
        <div className="relative" style={{ width: "62%", height: "88%", border: `1.5px solid ${isDark ? "#475569" : "#94a3b8"}`, borderRadius: 8 }}>
          {/* Nav */}
          <div className="absolute inset-x-0 top-0 h-[10%]" style={{ background: isDark ? "#1e293b" : "#e2e8f0", borderRadius: "6px 6px 0 0" }} />
          {/* Hero */}
          <div className="absolute" style={{ left: "5%", top: "13%", right: "5%", height: "22%", background: isDark ? "#334155" : "#cbd5e1", borderRadius: 4 }} />
          {/* Buttons */}
          <div className="absolute flex gap-1" style={{ left: "5%", top: "40%", right: "5%" }}>
            <div style={{ flex: 1, height: 8, background: "#3b82f6", borderRadius: 3 }} />
            <div style={{ flex: 1, height: 8, background: "transparent", border: `1px solid ${isDark ? "#64748b" : "#94a3b8"}`, borderRadius: 3 }} />
          </div>
          {/* Cards */}
          <div className="absolute flex gap-1" style={{ left: "5%", top: "55%", right: "5%" }}>
            {[0,1,2].map(i => <div key={i} style={{ flex: 1, height: 18, background: isDark ? "#1e293b" : "#e2e8f0", borderRadius: 3, border: `0.5px solid ${isDark ? "#334155" : "#cbd5e1"}` }} />)}
          </div>
          {/* Tabs */}
          <div className="absolute inset-x-0 bottom-0 h-[12%] flex items-center justify-around px-1" style={{ background: isDark ? "#1e293b" : "#e2e8f0", borderRadius: "0 0 6px 6px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isDark ? "#475569" : "#94a3b8" }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: isDark ? "#475569" : "#94a3b8" }} />
          </div>
        </div>
      </div>
    ),
  },
];

const CATEGORIES = [
  "Favorites", "All", "Blank", "Basic", "Business & Finance",
  "Project Management", "Notes & Meetings", "CRM & Sales", "Creative",
];

interface TemplateChooserModalProps {
  onCreateDocument: (title: string, type: DocType, content?: any) => void;
  onClose: () => void;
}

const TemplateChooserModal = ({ onCreateDocument, onClose }: TemplateChooserModalProps) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("blank-text");
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>("light");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_FAVORITES) || "[]"); } catch { return []; }
  });
  const modalRef = useRef<HTMLDivElement>(null);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem(LS_FAVORITES, JSON.stringify(next));
      return next;
    });
  }, []);

  const filteredBase = selectedCategory === "All"
    ? TEMPLATES
    : selectedCategory === "Favorites"
    ? TEMPLATES.filter(t => favorites.includes(t.id))
    : TEMPLATES.filter(t => t.category === selectedCategory);

  const filtered = filteredBase;
  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId) ?? TEMPLATES[0];

  const handleCategoryChange = useCallback((cat: string) => {
    setSelectedCategory(cat);
    const newFiltered = cat === "All"
      ? TEMPLATES
      : cat === "Favorites"
      ? TEMPLATES.filter(t => favorites.includes(t.id))
      : TEMPLATES.filter(t => t.category === cat);
    if (newFiltered.length > 0 && !newFiltered.find(t => t.id === selectedTemplateId)) {
      setSelectedTemplateId(newFiltered[0].id);
    }
  }, [selectedTemplateId, favorites]);

  const handleCreate = useCallback(() => {
    onCreateDocument(selectedTemplate.title, selectedTemplate.type, selectedTemplate.content);
    onClose();
  }, [selectedTemplate, onCreateDocument, onClose]);

  // Keyboard navigation — isolated to modal div (no window listener → no bleed)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation(); // prevent arrow keys from triggering desktop pagination
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
    if (e.key === "ArrowRight") { e.preventDefault(); setSelectedTemplateId(filtered[Math.min(currentIndex + 1, filtered.length - 1)].id); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); setSelectedTemplateId(filtered[Math.max(currentIndex - 1, 0)].id); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setSelectedTemplateId(filtered[Math.min(currentIndex + cols, filtered.length - 1)].id); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedTemplateId(filtered[Math.max(currentIndex - cols, 0)].id); }
  }, [onClose, handleCreate, filtered, selectedTemplateId, selectedCategory, handleCategoryChange]);

  useEffect(() => { modalRef.current?.focus(); }, []);

  const isDark = previewTheme === "dark";

  // Derived theme tokens for full-modal sync
  const modalBg = isDark ? "rgba(10,8,24,0.97)" : "rgba(250,250,252,0.98)";
  const modalBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const titleBarBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const titleBarBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const titleColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const toggleBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const toggleBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const toggleActiveBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const toggleActiveColor = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)";
  const toggleInactiveColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";
  const hintColor = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)";
  const sidebarBg = isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.025)";
  const sidebarBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const catLabelColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.3)";
  const catActiveBg = "rgba(59,130,246,0.85)";
  const catInactiveColor = isDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.5)";
  const catHoverBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const emptyColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
  const labelColor = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)";
  const labelSelectedColor = isDark ? "rgba(147,197,253,1)" : "rgba(37,99,235,1)";
  const subtitleColor = isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.3)";
  const actionBarBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)";
  const cancelBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const cancelColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const cancelBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const cancelHoverBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)";

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="template-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9980]"
        style={{ background: isDark ? "rgba(2,2,10,0.7)" : "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Modal */}
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
            width: 900, height: 600,
            background: modalBg,
            backdropFilter: "blur(48px)",
            border: `1px solid ${modalBorder}`,
            boxShadow: isDark
              ? "0 40px 120px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 40px 120px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* ── Title bar ───────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-5 shrink-0"
            style={{ height: 44, background: titleBarBg, borderBottom: `1px solid ${titleBarBorder}` }}>
            {/* Traffic lights */}
            <button onClick={onClose} className="group flex items-center justify-center"
              style={{ width: 13, height: 13, borderRadius: "50%", background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.25)" }}>
              <X size={7} strokeWidth={3} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(80,0,0,0.75)" }} />
            </button>
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.2)" }} />
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#28c840", border: "0.5px solid rgba(0,0,0,0.2)" }} />

            {/* Title — centered */}
            <span className="flex-1 text-center text-[13px] font-medium select-none" style={{ color: titleColor, marginLeft: -8 }}>
              Choose a Template
            </span>

            {/* ── Light / Dark preview toggle ─────────────────────────── */}
            <div className="flex items-center rounded-lg p-0.5" style={{ background: toggleBg, border: `1px solid ${toggleBorder}` }}>
              {([["light", Sun, "Light"], ["dark", Moon, "Dark"]] as const).map(([val, Icon, label]) => (
                <button
                  key={val}
                  onClick={() => setPreviewTheme(val)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200"
                  style={{
                    background: previewTheme === val ? toggleActiveBg : "transparent",
                    color: previewTheme === val ? toggleActiveColor : toggleInactiveColor,
                    boxShadow: previewTheme === val ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  <Icon size={11} />
                  {label}
                </button>
              ))}
            </div>

            {/* Keyboard hint */}
            <span className="text-[9px] select-none ml-1" style={{ color: hintColor }}>
              ↑↓←→ · Tab · ↵
            </span>
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="flex flex-col gap-0.5 py-4 px-2 overflow-y-auto shrink-0"
              style={{ width: 192, background: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest px-3 mb-1.5" style={{ color: catLabelColor }}>
                Categories
              </p>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 flex items-center gap-2"
                  style={{
                    background: selectedCategory === cat ? catActiveBg : "transparent",
                    color: selectedCategory === cat ? "#fff" : catInactiveColor,
                  }}
                  onMouseEnter={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = catHoverBg; }}
                  onMouseLeave={e => { if (selectedCategory !== cat) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {cat === "Favorites" && (
                    <Star size={10} fill={selectedCategory === "Favorites" ? "currentColor" : "none"} strokeWidth={2} className="shrink-0" />
                  )}
                  <span className="truncate">{cat}</span>
                  {cat === "Favorites" && favorites.length > 0 && (
                    <span className="ml-auto text-[9px] opacity-60">{favorites.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: emptyColor }}>
                  {selectedCategory === "Favorites"
                    ? <><Star size={28} /><p className="text-sm">Star templates to pin them here</p></>
                    : <><AlignLeft size={32} /><p className="text-sm">No templates in this category yet</p></>
                  }
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-8">
                  {filtered.map(template => {
                    const isSelected = template.id === selectedTemplateId;
                    const isFav = favorites.includes(template.id);
                    return (
                      <div
                        key={template.id}
                        className="flex flex-col items-center gap-3 cursor-pointer group/card"
                        onClick={() => setSelectedTemplateId(template.id)}
                        onDoubleClick={handleCreate}
                      >
                        {/* Thumbnail + star overlay */}
                        <div className="relative">
                          <div
                            className="transition-all duration-200"
                            style={{
                              borderRadius: 8,
                              overflow: "hidden",
                              width: 120,
                              aspectRatio: "1 / 1.4",
                              boxShadow: isSelected
                                ? "0 0 0 3px rgba(59,130,246,1), 0 8px 32px rgba(59,130,246,0.3)"
                                : isDark
                                  ? "0 4px 16px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.5)"
                                  : "0 4px 16px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)",
                              transform: isSelected ? "scale(1.05)" : "scale(1)",
                            }}
                          >
                            {template.thumbnail(isDark)}
                          </div>
                          {/* Star button */}
                          <motion.button
                            whileTap={{ scale: 0.75 }}
                            onClick={(e) => toggleFavorite(template.id, e)}
                            className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isFav
                                ? "opacity-100"
                                : "opacity-0 group-hover/card:opacity-100"
                            }`}
                            style={{
                              background: isFav ? "rgba(251,191,36,0.9)" : "rgba(0,0,0,0.4)",
                              backdropFilter: "blur(4px)",
                              boxShadow: isFav ? "0 0 6px rgba(251,191,36,0.6)" : "none",
                            }}
                          >
                            <Star size={9} fill={isFav ? "white" : "none"} stroke={isFav ? "none" : "white"} strokeWidth={2} />
                          </motion.button>
                        </div>
                        {/* Label */}
                        <div className="text-center">
                          <p className="text-[12px] font-semibold transition-colors"
                            style={{ color: isSelected ? labelSelectedColor : labelColor }}>
                            {template.title}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: subtitleColor }}>
                            {template.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Action bar ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 shrink-0"
            style={{ height: 64, background: actionBarBg, borderTop: `1px solid ${titleBarBorder}` }}>
            <div className="text-[11px]" style={{ color: subtitleColor }}>
              {selectedTemplate && (
                <span>
                  <span className="font-medium" style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.6)" }}>{selectedTemplate.title}</span>
                  {" · "}
                  {selectedTemplate.type === "text" ? "Word Document" : "Spreadsheet"}
                  {" · "}
                  <span style={{ color: "#3b82f6" }}>
                    {previewTheme === "dark" ? "Dark" : "Light"} preview
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                style={{ background: cancelBg, color: cancelColor, border: `1px solid ${cancelBorder}` }}
                onMouseEnter={e => (e.currentTarget.style.background = cancelHoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = cancelBg)}
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
