import { useState, useRef } from "react";
import { Plus, ArrowUp, Mic, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useFlux } from "@/context/FluxContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TypewriterPlaceholder from "./TypewriterPlaceholder";
import PlanModal from "./PlanModal";
import { t } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InputBarProps {
  onSubmit: (text: string) => void;
  docked?: boolean;
  onPlanSubmit?: (plan: { text: string; timeframe: string; focus: string }) => void;
}

// Semantic keyword map for cross-language folder matching
const SEMANTIC_KEYWORDS: Record<string, RegExp> = {
  finance: /økonomi|finans|budget|opsparing|finance|money|savings|economy|ekonomi/i,
  fitness: /træning|workout|fitness|training|exercise|gym|health|sundhed/i,
  project: /projekt|project|strategi|strategy/i,
  notes: /noter|notes|notat|journal|dagbog/i,
};

const InputBar = ({ onSubmit, docked = false, onPlanSubmit }: InputBarProps) => {
  const [value, setValue] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Duplicate modal state
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [duplicateCreateAction, setDuplicateCreateAction] = useState<(() => Promise<void>) | null>(null);
  const [duplicateUpdateAction, setDuplicateUpdateAction] = useState<(() => Promise<void>) | null>(null);

  const { createFolder, createTask, createGoal, activeFolder, activeView, setActiveFolder, setActiveView, getAllFoldersFlat, folders, goals, tasks, findFolderNode, updateGoal, updateTask } = useFlux();

  const parseDeadline = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const direct = new Date(raw);
    if (!isNaN(direct.getTime()) && raw.includes("-")) return raw;
    const months: Record<string, number> = {
      january: 0, februar: 1, february: 1, march: 2, marts: 2, april: 3, may: 4, maj: 4,
      june: 5, juni: 5, july: 6, juli: 6, august: 7, september: 8, october: 9, oktober: 9,
      november: 10, december: 11, decembre: 11,
    };
    const lower = raw.toLowerCase().trim();
    const monthNum = months[lower];
    if (monthNum !== undefined) {
      const year = new Date().getFullYear();
      const targetYear = monthNum < new Date().getMonth() ? year + 1 : year;
      return `${targetYear}-${String(monthNum + 1).padStart(2, "0")}-31`;
    }
    return null;
  };

  // Determine context folder based on current view
  const getContextFolderId = (): string | null => {
    if (activeView === "canvas" && activeFolder) {
      return activeFolder;
    }
    return null;
  };

  const getContextFolderInfo = () => {
    const id = getContextFolderId();
    if (!id) return { id: null, type: null, title: null };
    const folder = findFolderNode(id);
    return { id, type: folder?.type || null, title: folder?.title || null };
  };

  const showDuplicateModal = (
    message: string,
    onConfirmCreate: () => Promise<void>,
    onConfirmUpdate?: () => Promise<void>
  ) => {
    setDuplicateMessage(message);
    setDuplicateCreateAction(() => onConfirmCreate);
    setDuplicateUpdateAction(onConfirmUpdate ? () => onConfirmUpdate : null);
    setDuplicateOpen(true);
  };

  const handleDuplicateCreate = async () => {
    setDuplicateOpen(false);
    if (duplicateCreateAction) {
      await duplicateCreateAction();
      setDuplicateCreateAction(null);
      setDuplicateUpdateAction(null);
    }
  };

  const handleDuplicateUpdate = async () => {
    setDuplicateOpen(false);
    if (duplicateUpdateAction) {
      await duplicateUpdateAction();
      setDuplicateUpdateAction(null);
      setDuplicateCreateAction(null);
    }
  };

  // Semantic folder match: find existing folder by type + keyword matching
  const findSemanticFolder = (folderType: string, title: string) => {
    const allFolders = getAllFoldersFlat();
    // Direct type match first
    let match = allFolders.find((f) => f.type === folderType && f.parent_id === null);
    if (match) return match;
    // Semantic keyword match
    const regex = SEMANTIC_KEYWORDS[folderType];
    if (regex) {
      match = allFolders.find((f) => f.parent_id === null && regex.test(f.title));
      if (match) return match;
    }
    // Title similarity match
    if (title) {
      const titleLower = title.toLowerCase();
      match = allFolders.find((f) => f.parent_id === null && (
        f.title.toLowerCase().includes(titleLower) || titleLower.includes(f.title.toLowerCase())
      ));
    }
    return match || null;
  };

  const classifyAndRoute = async (text: string) => {
    setProcessing(true);
    try {
      const existingFolders = getAllFoldersFlat().map(f => ({ title: f.title, type: f.type, id: f.id }));
      const contextInfo = getContextFolderInfo();

      // Check if the user is asking for a simple note and we have context
      const isNoteIntent = /^(opret|lav|skriv|tilføj|create|add|write|make)\s+(en\s+)?(note|notat)/i.test(text);

      if (isNoteIntent && contextInfo.id) {
        const noteContent = text.replace(/^(opret|lav|skriv|tilføj|create|add|write|make)\s+(en\s+)?(note|notat)\s*(med|with|:)?\s*/i, "").trim();
        const existingNote = tasks.find(
          (tk) => tk.folder_id === contextInfo.id && tk.title.toLowerCase() === (noteContent || text).toLowerCase()
        );
        if (existingNote) {
          showDuplicateModal(
            t("duplicate.note_message"),
            async () => {
              await createTask({ title: noteContent || text, content: noteContent || text, type: "note", folder_id: contextInfo.id! });
              toast.success(`${t("toast.added")}: ${contextInfo.title}`);
            },
            async () => {
              await updateTask(existingNote.id, { content: noteContent || text, updated_at: new Date().toISOString() });
              toast.success(t("duplicate.updated"));
            }
          );
        } else {
          await createTask({ title: noteContent || text, content: noteContent || text, type: "note", folder_id: contextInfo.id! });
          toast.success(`${t("toast.added")}: ${contextInfo.title}`);
        }
        return;
      }

      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: {
          type: "classify",
          messages: [{ role: "user", content: text }],
          context: {
            existingFolders,
            currentFolderId: contextInfo.id,
            currentFolderType: contextInfo.type,
            currentFolderTitle: contextInfo.title,
            currentPage: activeView,
          },
        },
      });

      if (error) throw error;

      const { category, title, folder_type, output_type, target_amount, deadline, budget_items, tasks: aiTasks, use_current_folder, confidence_score } = data;

      // Layer: Confidence gate — if AI is unsure, ask for clarification
      if (confidence_score !== undefined && confidence_score < 50) {
        toast.info(t("toast.clarify_request"));
        return;
      }

      // Layer 2: Context — if AI says use current folder, or user is in a folder
      const useContextFolder = use_current_folder && contextInfo.id;

      // Layer 3: Semantic folder detection
      let targetFolder = findSemanticFolder(folder_type, title || "");

      if (!targetFolder) {
        if (category === "note" && activeView === "stream" && !activeFolder) {
          const allFolders = getAllFoldersFlat();
          const notesFolder = allFolders.find((f) => /^(noter|notes)$/i.test(f.title));
          if (notesFolder) {
            targetFolder = notesFolder;
          } else {
            const newFolder = await createFolder({ title: t("folder.notes"), type: "notes" });
            if (newFolder) {
              targetFolder = { id: newFolder.id, title: newFolder.title, type: newFolder.type, color: newFolder.color, icon: newFolder.icon || null, parent_id: newFolder.parent_id, sort_order: newFolder.sort_order, children: [], tasks: [] };
              toast.success(`${t("toast.created")}: ${t("folder.notes")}`);
            }
          }
        } else {
          const folderName = folder_type === "finance" ? t("folder.finance")
            : folder_type === "fitness" ? t("folder.fitness")
            : folder_type === "project" ? title
            : t("folder.notes");
          const newFolder = await createFolder({ title: folderName, type: folder_type });
          if (newFolder) {
            targetFolder = { id: newFolder.id, title: newFolder.title, type: newFolder.type, color: newFolder.color, icon: newFolder.icon || null, parent_id: newFolder.parent_id, sort_order: newFolder.sort_order, children: [], tasks: [] };
            toast.success(`${t("toast.created")}: ${folderName}`);
          }
        }
      }

      // Use context folder for notes/items if user is inside a folder
      const effectiveFolderId = useContextFolder ? contextInfo.id! : (
        (category === "note" && contextInfo.id) ? contextInfo.id! : (targetFolder?.id || null)
      );

      // Layer 5: Duplicate validation per category
      if (category === "savings_goal") {
        const parsedDeadline = parseDeadline(deadline);
        const existingGoal = goals.find(
          (g) => g.target_amount === (target_amount || 0) && g.folder_id === (targetFolder?.id || null)
        );
        if (existingGoal) {
          showDuplicateModal(
            t("duplicate.goal_message"),
            async () => {
              await createGoal({
                title: title || text, target_amount: target_amount || 0,
                current_amount: 0, deadline: parsedDeadline, pinned: false,
                folder_id: targetFolder?.id || null,
              });
              toast.success(t("toast.savings_created"));
            },
            async () => {
              await updateGoal(existingGoal.id, {
                title: title || existingGoal.title,
                target_amount: target_amount || existingGoal.target_amount,
                deadline: parsedDeadline || existingGoal.deadline,
              });
              toast.success(t("duplicate.updated"));
            }
          );
        } else {
          const goal = await createGoal({
            title: title || text, target_amount: target_amount || 0,
            current_amount: 0, deadline: parsedDeadline, pinned: false,
            folder_id: targetFolder?.id || null,
          });
          if (goal) {
            toast.success(t("toast.savings_created"));
            setActiveView("stream");
          }
        }
      } else if (category === "budget") {
        // Budget intent — ALWAYS place under Økonomi folder, create if missing
        if (!targetFolder || targetFolder.type !== "finance") {
          const allFolders = getAllFoldersFlat();
          const financeFolder = allFolders.find((f) => f.type === "finance" || /^(økonomi|finances?|budget)$/i.test(f.title));
          if (financeFolder) {
            targetFolder = financeFolder;
          } else {
            const newFolder = await createFolder({ title: t("folder.finance"), type: "finance" });
            if (newFolder) {
              targetFolder = { id: newFolder.id, title: newFolder.title, type: newFolder.type, color: newFolder.color, icon: newFolder.icon || null, parent_id: newFolder.parent_id, sort_order: newFolder.sort_order, children: [], tasks: [] };
              toast.success(`${t("toast.created")}: ${t("folder.finance")}`);
            }
          }
        }

        // Build budget rows — use AI items or sensible defaults
        const items = budget_items?.length ? budget_items.map((bi: any) => ({
          category: bi.item || bi.category || "",
          budgeted: bi.cost || bi.budgeted || 0,
          spent: bi.spent || 0,
        })) : [
          { category: "Husleje", budgeted: 0, spent: 0 },
          { category: "Mad & Dagligvarer", budgeted: 0, spent: 0 },
          { category: "Transport", budgeted: 0, spent: 0 },
          { category: "Underholdning", budgeted: 0, spent: 0 },
          { category: "", budgeted: 0, spent: 0 },
        ];

        // Check for existing budget in this folder
        const existingBudget = tasks.find(
          (tk) => tk.folder_id === targetFolder?.id && tk.type === "budget"
        );

        if (existingBudget) {
          showDuplicateModal(
            t("duplicate.budget_message"),
            async () => {
              // Create new budget
              const budgetTitle = title || `Budget — ${new Date().toLocaleDateString("da-DK", { month: "long", year: "numeric" })}`;
              await createTask({ title: budgetTitle, type: "budget", folder_id: targetFolder!.id, content: JSON.stringify(items) });
              setActiveFolder(targetFolder!.id);
              setActiveView("canvas");
              toast.success(t("toast.budget_created"));
            },
            async () => {
              // Update existing budget
              await updateTask(existingBudget.id, { content: JSON.stringify(items) });
              setActiveFolder(targetFolder!.id);
              setActiveView("canvas");
              toast.success(t("duplicate.updated"));
            }
          );
        } else {
          // Create budget task with JSON content
          const budgetTitle = title || `Budget — ${new Date().toLocaleDateString("da-DK", { month: "long", year: "numeric" })}`;
          await createTask({ title: budgetTitle, type: "budget", folder_id: targetFolder!.id, content: JSON.stringify(items) });
          setActiveFolder(targetFolder!.id);
          setActiveView("canvas");
          toast.success(t("toast.budget_created"));
        }
      } else if (category === "project" && aiTasks?.length) {
        const allFolders = getAllFoldersFlat();
        const existingProject = allFolders.find(
          (f) => f.title.toLowerCase() === (title || "").toLowerCase() && f.type === "project"
        );
        if (existingProject) {
          const existingTitles = new Set(tasks.filter(tk => tk.folder_id === existingProject.id).map(tk => tk.title.toLowerCase()));
          const newTasks = aiTasks.filter((tk: string) => !existingTitles.has(tk.toLowerCase()));
          if (newTasks.length > 0) {
            for (const taskTitle of newTasks) {
              await createTask({ title: taskTitle, folder_id: existingProject.id, type: "task" });
            }
            toast.success(t("toast.tasks_added"));
          } else {
            showDuplicateModal(t("duplicate.project_message"), async () => {
              for (const taskTitle of aiTasks) {
                await createTask({ title: taskTitle, folder_id: existingProject.id, type: "task" });
              }
              toast.success(t("toast.tasks_added"));
            });
          }
          setActiveFolder(existingProject.id);
          setActiveView("canvas");
        } else {
          const pFolder = await createFolder({ title: title || text.slice(0, 40), type: "project" });
          if (pFolder) {
            for (const taskTitle of aiTasks) {
              await createTask({ title: taskTitle, folder_id: pFolder.id, type: "task" });
            }
            setActiveFolder(pFolder.id);
            setActiveView("canvas");
            toast.success(t("toast.project_created"));
          }
        }
      } else if (category === "fitness" && aiTasks?.length) {
        const rootFitness = targetFolder;
        const allFolders = getAllFoldersFlat();
        const existingFitness = allFolders.find(
          (f) => f.title.toLowerCase() === (title || "").toLowerCase() && f.parent_id === (rootFitness?.id || null)
        );
        if (existingFitness) {
          const existingTitles = new Set(tasks.filter(tk => tk.folder_id === existingFitness.id).map(tk => tk.title.toLowerCase()));
          const newTasks = aiTasks.filter((tk: string) => !existingTitles.has(tk.toLowerCase()));
          if (newTasks.length > 0) {
            for (const taskTitle of newTasks) {
              await createTask({ title: taskTitle, folder_id: existingFitness.id, type: "task" });
            }
            toast.success(t("toast.tasks_added"));
          } else {
            showDuplicateModal(t("duplicate.fitness_message"), async () => {
              for (const taskTitle of aiTasks) {
                await createTask({ title: taskTitle, folder_id: existingFitness.id, type: "task" });
              }
              toast.success(t("toast.tasks_added"));
            });
          }
          setActiveFolder(existingFitness.id);
          setActiveView("canvas");
        } else {
          const fFolder = await createFolder({ 
            title: title || text.slice(0, 40), type: "fitness",
            parent_id: rootFitness?.id || null,
          });
          if (fFolder) {
            for (const taskTitle of aiTasks) {
              await createTask({ title: taskTitle, folder_id: fFolder.id, type: "task" });
            }
            setActiveFolder(fFolder.id);
            setActiveView("canvas");
            toast.success(t("toast.fitness_created"));
          }
        }
      } else if (category === "fitness") {
        const fFolder = await createFolder({ 
          title: title || text.slice(0, 40), type: "fitness",
          parent_id: targetFolder?.id || null,
        });
        if (fFolder) {
          setActiveFolder(fFolder.id);
          setActiveView("canvas");
          toast.success(t("toast.fitness_created"));
        }
      } else {
        // Note or fallback — check for duplicate in target folder
        const existingNote = tasks.find(
          (tk) => tk.folder_id === effectiveFolderId && tk.title.toLowerCase() === (title || text).toLowerCase()
        );
        if (existingNote) {
          showDuplicateModal(
            t("duplicate.note_message"),
            async () => {
              await createTask({ title: title || text, content: text, type: "note", folder_id: effectiveFolderId });
              const folderName = effectiveFolderId ? (findFolderNode(effectiveFolderId)?.title || "") : t("inbox.title");
              toast.success(`${t("toast.added")}: ${folderName}`);
            },
            async () => {
              await updateTask(existingNote.id, { content: text, updated_at: new Date().toISOString() });
              toast.success(t("duplicate.updated"));
            }
          );
        } else {
          await createTask({ title: title || text, content: text, type: "note", folder_id: effectiveFolderId });
          const folderName = effectiveFolderId ? (findFolderNode(effectiveFolderId)?.title || "") : t("inbox.title");
          toast.success(`${t("toast.added")}: ${folderName}`);
        }
      }
    } catch (e: any) {
      console.error("classify error:", e);
      const contextFolderId = getContextFolderId();
      await createTask({ title: text.slice(0, 100), content: text, type: "note", folder_id: contextFolderId });
      toast.success(t("toast.added_as_note"));
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (value.trim() && !processing) {
      const text = value.trim();
      classifyAndRoute(text);
      setValue("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info(`${t("toast.processing")} ${file.name}...`);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());

      if (file.name.endsWith(".csv") || file.type === "text/csv") {
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const rows = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim());
          const itemIdx = headers.findIndex((h) => h.includes("item") || h.includes("name") || h.includes("description"));
          const costIdx = headers.findIndex((h) => h.includes("cost") || h.includes("amount") || h.includes("price"));
          const catIdx = headers.findIndex((h) => h.includes("category") || h.includes("type"));
          return {
            category: (catIdx >= 0 ? cols[catIdx] : undefined) || cols[itemIdx >= 0 ? itemIdx : 0] || "",
            budgeted: parseFloat(cols[costIdx >= 0 ? costIdx : 1]) || 0,
            spent: 0,
          };
        });

        // Create budget task from CSV in Økonomi folder
        const allFolders = getAllFoldersFlat();
        let financeFolder = allFolders.find((f) => f.type === "finance" || /^(økonomi|finances?|budget)$/i.test(f.title));
        if (!financeFolder) {
          const newFolder = await createFolder({ title: t("folder.finance"), type: "finance" });
          if (newFolder) {
            financeFolder = { id: newFolder.id, title: newFolder.title, type: newFolder.type, color: newFolder.color, icon: newFolder.icon || null, parent_id: newFolder.parent_id, sort_order: newFolder.sort_order, children: [], tasks: [] };
          }
        }
        if (financeFolder) {
          const budgetTitle = file.name.replace(/\.\w+$/, "");
          await createTask({ title: budgetTitle, type: "budget", folder_id: financeFolder.id, content: JSON.stringify(rows) });
          setActiveFolder(financeFolder.id);
          setActiveView("canvas");
        }

        toast.success(t("toast.parsed_rows", { count: rows.length, name: file.name }));
      } else {
        await createTask({ title: file.name, content: text.slice(0, 2000), type: "note" });
        toast.success(t("toast.added_file", { name: file.name }));
      }
    } catch (err) {
      console.error("File parse error:", err);
      toast.error(t("toast.parse_error"));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <motion.div layout className={`w-full max-w-2xl mx-auto`}>
        <div className="glass-input p-2">
          {voiceActive ? (
            <div className="flex items-center justify-center gap-1.5 py-6 px-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-[hsl(var(--aurora-blue))] to-[hsl(var(--aurora-pink))]"
                  animate={{ height: [8, 28, 8] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                />
              ))}
              <button onClick={() => setVoiceActive(false)} className="ml-6 text-sm text-muted-foreground hover:text-foreground transition-colors">{t("input.cancel")}</button>
            </div>
          ) : (
            <>
              <div className="relative w-full">
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                  }}
                  rows={1}
                  disabled={processing}
                  className="w-full p-4 pl-6 text-lg bg-transparent outline-none resize-none font-sans disabled:opacity-50"
                />
                {!value && (
                  <div className="absolute top-0 left-0 p-4 pl-6 text-lg pointer-events-none">
                    <TypewriterPlaceholder />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-4 pb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Plus size={18} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.json,.md"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex items-center gap-2">
                  {processing && <span className="text-xs text-primary animate-pulse">{t("input.thinking")}</span>}
                  <button
                    onClick={() => setPlanOpen(true)}
                    className="text-xs font-medium text-muted-foreground px-2 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {t("input.plan")}
                  </button>
                  <button onClick={() => setVoiceActive(true)} className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <Mic size={16} />
                  </button>
                  <button onClick={handleSubmit} disabled={processing} className="p-2 rounded-full bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50">
                    <ArrowUp size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Duplicate confirmation modal with Update / Create / Cancel */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              {t("duplicate.title")}
            </DialogTitle>
            <DialogDescription>
              {duplicateMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <button
              onClick={() => setDuplicateOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
            >
              {t("duplicate.cancel")}
            </button>
            {duplicateUpdateAction && (
              <button
                onClick={handleDuplicateUpdate}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
              >
                {t("duplicate.update")}
              </button>
            )}
            <button
              onClick={handleDuplicateCreate}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {t("duplicate.confirm")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        onSubmit={(plan) => {
          onPlanSubmit?.(plan);
          onSubmit(plan.text);
        }}
      />
    </>
  );
};

export default InputBar;
