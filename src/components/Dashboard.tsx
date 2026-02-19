import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FluxSidebar from "./FluxSidebar";
import GridDashboard from "./GridDashboard";
import Scheduler from "./Scheduler";
import InputBar from "./InputBar";
import MobileNav from "./MobileNav";
import Canvas from "./Canvas";
import TheCouncil from "./TheCouncil";
import FocusDashboardView from "./focus/FocusDashboardView";
import CalendarView from "./CalendarView";
import AnalyticsView from "./AnalyticsView";
import ProjectsOverview from "./ProjectsOverview";
import DocumentsView from "./DocumentsView";
import SettingsView from "./SettingsView";
import CreateFolderModal, { suggestIcon } from "./CreateFolderModal";
import TeamChatWidget from "./chat/TeamChatWidget";
import { useFlux } from "@/context/FluxContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { t } from "@/lib/i18n";

interface DashboardProps {
  initialPrompt?: string;
  pendingPlan?: any;
  onPlanConsumed?: () => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  focusMode: boolean;
}

/** Generate a clean folder name from the user's plan text */
function deriveFolderName(text: string): string {
  const cleaned = text
    .replace(/^(jeg vil gerne|jeg vil|jeg ønsker at|i want to|i'd like to|i would like to|plan for|planlæg)\s*/i, "")
    .replace(/[.!?]+$/, "")
    .trim();

  const words = cleaned.split(/\s+/).slice(0, 5);
  const name = words.join(" ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const Dashboard = ({ initialPrompt, pendingPlan, onPlanConsumed, sidebarVisible, onToggleSidebar, focusMode }: DashboardProps) => {
  const { activeView, createTask, createFolder, createBlock, setActiveFolder, setActiveView } = useFlux();
  const [lastSubmitted, setLastSubmitted] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const planProcessed = useRef(false);

  // Process pending plan from pre-login flow
  useEffect(() => {
    if (pendingPlan && !planProcessed.current) {
      planProcessed.current = true;
      handlePlanSubmit(pendingPlan).then(() => onPlanConsumed?.());
    }
  }, [pendingPlan]);

  const handlePlanSubmit = useCallback(async (plan: any) => {
    if (!plan.steps?.length) return;

    const folderName = deriveFolderName(plan.text);
    const folder = await createFolder({
      title: folderName,
      type: "project",
      color: null,
      icon: suggestIcon(folderName),
    });

    if (!folder) {
      toast.error("Kunne ikke oprette mappe");
      return;
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const createdTasks: any[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const isToday = i < 3;
      const priority = i === 0 ? "high" : i < 3 ? "medium" : "low";

      const task = await createTask({
        title: step.title,
        content: step.description,
        folder_id: folder.id,
        priority,
        scheduled_date: isToday ? today : null,
      });
      if (task) createdTasks.push(task);
    }

    const startHour = new Date().getHours() + 1;
    const todayTasks = createdTasks.filter((_, i) => i < 3);
    for (let i = 0; i < todayTasks.length; i++) {
      const hour = startHour + i;
      if (hour < 22) {
        await createBlock({
          title: todayTasks[i].title,
          time: `${String(hour).padStart(2, "0")}:00`,
          duration: "45m",
          type: "deep",
          scheduled_date: today,
          task_id: todayTasks[i].id,
        });
      }
    }

    setActiveView("canvas");
    setActiveFolder(folder.id);

    toast.success(`"${folderName}" oprettet med ${createdTasks.length} opgaver`, {
      description: `${todayTasks.length} opgaver planlagt i dag`,
    });
  }, [createTask, createFolder, createBlock, setActiveFolder, setActiveView]);

  const handleCreateFolder = useCallback(async (data: { title: string; color: string | null; icon: string; subfolders: string[] }) => {
    const parent = await createFolder({ title: data.title, type: "project", color: data.color, icon: data.icon });
    if (parent && data.subfolders.length > 0) {
      for (const sub of data.subfolders) {
        const subIcon = suggestIcon(sub);
        await createFolder({ title: sub, type: "project", parent_id: parent.id, color: data.color, icon: subIcon });
      }
    }
    toast.success(t("brain.folder_created"));
  }, [createFolder]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative z-10 flex min-h-screen w-full"
    >
      {/* Left sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <FluxSidebar visible={sidebarVisible} onToggle={onToggleSidebar} onRequestCreateFolder={() => setShowCreateModal(true)} />
      </div>

      {/* Center stage */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {activeView === "focus" || activeView === "stream" ? (
          <FocusDashboardView />
        ) : activeView === "council" ? (
          <TheCouncil />
        ) : activeView === "calendar" ? (
          <CalendarView />
        ) : activeView === "analytics" ? (
          <AnalyticsView />
        ) : activeView === "projects" ? (
          <ProjectsOverview />
        ) : activeView === "documents" ? (
          <DocumentsView />
        ) : activeView === "settings" ? (
          <SettingsView />
        ) : (
          <Canvas />
        )}

        {/* Docked input — extra bottom padding on mobile for nav */}
        {!["council", "focus", "stream", "calendar", "analytics", "projects", "documents", "settings"].includes(activeView) && (
          <div className="sticky bottom-0 px-3 pb-16 pt-2 md:px-4 md:pb-6 bg-gradient-to-t from-background/80 to-transparent">
            <InputBar onSubmit={(text) => setLastSubmitted(text)} docked />
          </div>
        )}
      </div>

      {/* Right sidebar — scheduler, hidden below lg */}
      {!["council", "focus", "stream", "calendar", "analytics", "projects", "documents", "settings"].includes(activeView) && (
        <div className="hidden lg:block">
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="w-[300px] min-w-[300px] glass-panel border-l border-white/30"
          >
            <Scheduler />
          </motion.aside>
        </div>
      )}

      <MobileNav />
      {/* Hide floating chat on Home — it's a native widget there */}
      {activeView !== "focus" && activeView !== "stream" && <TeamChatWidget />}
      <CreateFolderModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateFolder}
      />
    </motion.div>
  );
};

export default Dashboard;
