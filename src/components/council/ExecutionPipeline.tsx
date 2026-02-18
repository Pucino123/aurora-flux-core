import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, Loader2, CheckSquare, Calendar, DollarSign, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

interface ExecutionStep {
  title: string;
  priority: "high" | "medium" | "low";
  duration: string;
  category: string;
  dependencies: string[];
}

interface ExecutionPlan {
  steps: ExecutionStep[];
  timeline: string;
  budget_estimate: string;
  kpis: string[];
  bottlenecks: string[];
}

interface ExecutionPipelineProps {
  ideaId: string;
  ideaContent: string;
  userId: string;
  onCreateTasks: (tasks: { title: string; priority: string }[]) => void;
}

const priorityColors: Record<string, string> = {
  high: "hsl(0 84% 60%)",
  medium: "hsl(45 90% 55%)",
  low: "hsl(150 60% 45%)",
};

const ExecutionPipeline = ({ ideaId, ideaContent, userId, onCreateTasks }: ExecutionPipelineProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("flux-ai", {
        body: { type: "council-execute", idea: ideaContent },
      });
      if (error) throw error;
      setPlan(data);
    } catch (e: any) {
      console.error("Execution pipeline error:", e);
      toast.error(t("council.error"));
    } finally {
      setLoading(false);
    }
  };

  const convertToTasks = async () => {
    if (!plan) return;
    const tasks = plan.steps.map((s) => ({ title: s.title, priority: s.priority }));

    // Create a project folder
    const { data: folder } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        title: ideaContent.slice(0, 40),
        type: "project",
      })
      .select()
      .single();

    if (folder) {
      const taskInserts = tasks.map((t, i) => ({
        user_id: userId,
        folder_id: folder.id,
        title: t.title,
        priority: t.priority,
        sort_order: i,
        type: "task" as const,
        status: "todo" as const,
      }));
      await supabase.from("tasks").insert(taskInserts);
    }

    onCreateTasks(tasks);
    toast.success(t("council.tasks_created"));
  };

  return (
    <div className="mb-4">
      <button
        onClick={plan ? () => setOpen(!open) : generate}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 border border-orange-500/20 transition-all"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} className="text-orange-500" />}
        🚀 {t("council.execute")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            {loading && (
              <div className="flux-card text-center py-8">
                <Loader2 size={24} className="animate-spin mx-auto mb-3 text-orange-500" />
                <p className="text-sm text-muted-foreground">{t("council.generating_plan")}</p>
              </div>
            )}

            {!loading && plan && (
              <div className="space-y-3">
                {/* Overview metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flux-card py-2 text-center">
                    <Calendar size={14} className="mx-auto mb-1 text-blue-500" />
                    <p className="text-[10px] font-bold">{plan.timeline}</p>
                    <p className="text-[8px] text-muted-foreground">{t("council.timeline")}</p>
                  </div>
                  <div className="flux-card py-2 text-center">
                    <DollarSign size={14} className="mx-auto mb-1 text-green-500" />
                    <p className="text-[10px] font-bold">{plan.budget_estimate}</p>
                    <p className="text-[8px] text-muted-foreground">{t("council.budget")}</p>
                  </div>
                  <div className="flux-card py-2 text-center">
                    <CheckSquare size={14} className="mx-auto mb-1 text-purple-500" />
                    <p className="text-[10px] font-bold">{plan.steps.length}</p>
                    <p className="text-[8px] text-muted-foreground">{t("council.steps")}</p>
                  </div>
                </div>

                {/* Steps */}
                <div className="flux-card">
                  <h4 className="text-xs font-bold mb-2">{t("council.action_steps")}</h4>
                  <div className="space-y-1.5">
                    {plan.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-secondary/30">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: priorityColors[step.priority] || priorityColors.medium }}
                        />
                        <span className="text-[11px] flex-1">{step.title}</span>
                        <span className="text-[9px] text-muted-foreground">{step.duration}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{step.category}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPIs */}
                {plan.kpis.length > 0 && (
                  <div className="flux-card">
                    <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
                      <Target size={12} />
                      {t("council.kpis")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.kpis.map((kpi, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">{kpi}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottlenecks */}
                {plan.bottlenecks.length > 0 && (
                  <div className="flux-card border border-orange-500/10">
                    <h4 className="text-xs font-bold mb-1 text-orange-600">{t("council.bottlenecks")}</h4>
                    <ul className="space-y-0.5">
                      {plan.bottlenecks.map((b, i) => (
                        <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                          <span className="text-orange-500 mt-0.5">⚠</span> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Convert button */}
                <button
                  onClick={convertToTasks}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <CheckSquare size={14} />
                  {t("council.convert_to_tasks")}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExecutionPipeline;
