import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Table, MessageSquare, Brain, X,
  BookOpen, ClipboardList, FileBarChart, LayoutList,
  Lightbulb, Target, Map, Users, MessagesSquare,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  type: "text" | "spreadsheet";
  category: string;
}

const TEMPLATES: { category: string; emoji: string; items: Template[] }[] = [
  {
    category: "Documents",
    emoji: "📄",
    items: [
      { id: "blank", name: "Blank Page", description: "Start from scratch", icon: FileText, type: "text", category: "Documents" },
      { id: "structured-note", name: "Structured Note", description: "Headings & sections", icon: BookOpen, type: "text", category: "Documents" },
      { id: "meeting-notes", name: "Meeting Notes", description: "Agenda & action items", icon: ClipboardList, type: "text", category: "Documents" },
      { id: "project-brief", name: "Project Brief", description: "Goals, scope & timeline", icon: Target, type: "text", category: "Documents" },
    ],
  },
  {
    category: "Spreadsheets",
    emoji: "📊",
    items: [
      { id: "budget", name: "Budget Planner", description: "Track income & expenses", icon: FileBarChart, type: "spreadsheet", category: "Spreadsheets" },
      { id: "kpi", name: "KPI Tracker", description: "Metrics & progress", icon: LayoutList, type: "spreadsheet", category: "Spreadsheets" },
      { id: "roadmap", name: "Roadmap Timeline", description: "Plan milestones", icon: Map, type: "spreadsheet", category: "Spreadsheets" },
      { id: "task-overview", name: "Task Overview", description: "Status & priorities", icon: Table, type: "spreadsheet", category: "Spreadsheets" },
    ],
  },
  {
    category: "Creative",
    emoji: "🧠",
    items: [
      { id: "brainstorm", name: "Brainstorm Board", description: "Free-flow ideas", icon: Brain, type: "text", category: "Creative" },
      { id: "idea-vault", name: "Idea Vault", description: "Capture & organize", icon: Lightbulb, type: "text", category: "Creative" },
      { id: "strategy", name: "Strategy Canvas", description: "Plan & analyze", icon: Target, type: "text", category: "Creative" },
    ],
  },
  {
    category: "Communication",
    emoji: "💬",
    items: [
      { id: "memo", name: "Internal Memo", description: "Formal updates", icon: MessageSquare, type: "text", category: "Communication" },
      { id: "collab", name: "Collaboration Doc", description: "Shared workspace", icon: Users, type: "text", category: "Communication" },
      { id: "feedback", name: "Feedback Board", description: "Collect input", icon: MessagesSquare, type: "text", category: "Communication" },
    ],
  },
];

const TEMPLATE_CONTENT: Record<string, any> = {
  "structured-note": { html: "<h1>Title</h1><h2>Overview</h2><p></p><h2>Details</h2><p></p><h2>Next Steps</h2><p></p>" },
  "meeting-notes": { html: "<h1>Meeting Notes</h1><p><strong>Date:</strong> </p><p><strong>Attendees:</strong> </p><h2>Agenda</h2><ul><li></li></ul><h2>Discussion</h2><p></p><h2>Action Items</h2><ul><li></li></ul>" },
  "project-brief": { html: "<h1>Project Brief</h1><h2>Objective</h2><p></p><h2>Scope</h2><p></p><h2>Timeline</h2><p></p><h2>Success Criteria</h2><ul><li></li></ul>" },
  "brainstorm": { html: "<h1>Brainstorm</h1><h2>Topic</h2><p></p><h2>Ideas</h2><ul><li></li></ul><h2>Top Picks</h2><p></p>" },
  "idea-vault": { html: "<h1>Idea Vault</h1><h2>💡 Idea</h2><p></p><h2>Why it matters</h2><p></p><h2>Next action</h2><p></p>" },
  "strategy": { html: "<h1>Strategy Canvas</h1><h2>Vision</h2><p></p><h2>Current State</h2><p></p><h2>Target State</h2><p></p><h2>Key Initiatives</h2><ul><li></li></ul>" },
  "memo": { html: "<h1>Internal Memo</h1><p><strong>To:</strong> </p><p><strong>From:</strong> </p><p><strong>Date:</strong> </p><h2>Subject</h2><p></p><h2>Details</h2><p></p>" },
  "collab": { html: "<h1>Collaboration Doc</h1><h2>Purpose</h2><p></p><h2>Contributions</h2><p></p><h2>Decisions</h2><p></p>" },
  "feedback": { html: "<h1>Feedback Board</h1><h2>What's working</h2><ul><li></li></ul><h2>What needs improvement</h2><ul><li></li></ul><h2>Ideas</h2><ul><li></li></ul>" },
  "budget": { rows: [["Category", "Budget", "Actual", "Difference", "Notes"], ["Rent", "", "", "=B2-C2", ""], ["Utilities", "", "", "=B3-C3", ""], ["Marketing", "", "", "=B4-C4", ""], ["Salaries", "", "", "=B5-C5", ""], ...Array.from({ length: 5 }, () => ["", "", "", "", ""])] },
  "kpi": { rows: [["KPI", "Target", "Current", "Status", "Notes"], ["Revenue", "", "", "", ""], ["Users", "", "", "", ""], ["NPS", "", "", "", ""], ...Array.from({ length: 6 }, () => ["", "", "", "", ""])] },
  "roadmap": { rows: [["Milestone", "Start", "End", "Owner", "Status"], ["Phase 1", "", "", "", ""], ["Phase 2", "", "", "", ""], ["Phase 3", "", "", "", ""], ...Array.from({ length: 6 }, () => ["", "", "", "", ""])] },
  "task-overview": { rows: [["Task", "Priority", "Status", "Assigned", "Due"], ...Array.from({ length: 9 }, () => ["", "", "", "", ""])] },
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateDocument: (title: string, type: "text" | "spreadsheet", content?: any) => void;
}

const FolderTemplateSelector = ({ open, onClose, onCreateDocument }: Props) => {
  const handleSelect = (template: Template) => {
    const content = TEMPLATE_CONTENT[template.id];
    onCreateDocument(template.name, template.type, content);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute inset-0 z-[10] bg-card/95 backdrop-blur-xl rounded-2xl overflow-y-auto p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Create from Template</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-5">
            {TEMPLATES.map((group) => (
              <div key={group.category}>
                <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {group.emoji} {group.category}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {group.items.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSelect(t)}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-border/30 transition-all duration-150 text-left group/t hover:scale-[1.02]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover/t:bg-primary/15 transition-colors">
                          {React.createElement(t.icon, { size: 16, className: "text-primary" })}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FolderTemplateSelector;
