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

  // ── CRM & SALES ──────────────────────────────────────────────────────────
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
];

const CATEGORIES = [
  "Favorites", "All", "Blank", "Basic", "Business & Finance",
  "Project Management", "Notes & Meetings", "CRM & Sales",
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
