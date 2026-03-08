import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Focus } from "lucide-react";
import FluxSidebar from "./FluxSidebar";
import GridDashboard from "./GridDashboard";
import Scheduler from "./Scheduler";
import MobileNav from "./MobileNav";
import Canvas from "./Canvas";
import TheCouncil from "./TheCouncil";
import FocusDashboardView from "./focus/FocusDashboardView";
import FullCalendarView from "../pages/FullCalendarView";
import AITaskManager from "../pages/AITaskManager";
import AnalyticsView from "./AnalyticsView";
import ProjectsOverview from "./ProjectsOverview";
import DocumentsView from "./DocumentsView";
import SettingsView from "./SettingsView";
import CreateFolderModal, { suggestIcon } from "./CreateFolderModal";
import MultitaskingView from "./MultitaskingView";
import CommunityBoardView from "./CommunityBoardView";
import CommunityAdminView from "./CommunityAdminView";
import BillingView from "./billing/BillingView";
import { UpgradeModal, OutOfSparksModal } from "./billing/BillingView";
import CRMPage from "../pages/CRMPage";
import ControlCenter from "./ControlCenter";
import { useFlux } from "@/context/FluxContext";
import { useMonetization } from "@/context/MonetizationContext";
import { useFocusMode } from "@/context/FocusModeContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { t } from "@/lib/i18n";
import OnboardingFlow from "./onboarding/OnboardingFlow";
import FocusControlBar from "./focus/FocusControlBar";

interface DashboardProps {
  initialPrompt?: string;
  pendingPlan?: any;
  onPlanConsumed?: () => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  focusMode: boolean;
}

function deriveFolderName(text: string): string {
  const cleaned = text
    .replace(/^(jeg vil gerne|jeg vil|jeg ønsker at|i want to|i'd like to|i would like to|plan for|planlæg)\s*/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 5);
  const name = words.join(" ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const VIEWS_WITHOUT_INPUT = ["council", "focus", "calendar", "analytics", "projects", "documents", "settings", "tasks", "multitask", "community", "community-admin", "billing", "canvas"];
const VIEWS_WITHOUT_SCHEDULER = [...VIEWS_WITHOUT_INPUT];

const Dashboard = ({ initialPrompt, pendingPlan, onPlanConsumed, sidebarVisible, onToggleSidebar, focusMode }: DashboardProps) => {
  const { activeView, createTask, createFolder, createBlock, setActiveFolder, setActiveView } = useFlux();
  const { billingOpen, closeBilling } = useMonetization();
  const { isFocusModeActive, disableFocusMode } = useFocusMode();
  const [lastSubmitted, setLastSubmitted] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [controlCenterOpen, setControlCenterOpen] = useState(false);
  const planProcessed = useRef(false);

  useEffect(() => {
    if (pendingPlan && !planProcessed.current) {
      planProcessed.current = true;
      handlePlanSubmit(pendingPlan).then(() => onPlanConsumed?.());
    }
  }, [pendingPlan]);

  // Sync billing modal with activeView
  useEffect(() => {
    if (billingOpen) setActiveView("billing" as any);
  }, [billingOpen, setActiveView]);

  // Listen for Control Center toggle from keyboard or other triggers
  useEffect(() => {
    const handler = () => setControlCenterOpen(p => !p);
    window.addEventListener("open-control-center", handler);
    return () => window.removeEventListener("open-control-center", handler);
  }, []);

  const handlePlanSubmit = useCallback(async (plan: any) => {
    if (!plan.steps?.length) return;
    const folderName = deriveFolderName(plan.text);
    const folder = await createFolder({ title: folderName, type: "project", color: null, icon: suggestIcon(folderName) });
    if (!folder) { toast.error("Could not create folder"); return; }
    const today = format(new Date(), "yyyy-MM-dd");
    const createdTasks: any[] = [];
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      const isToday = i < 3;
      const priority = i === 0 ? "high" : i < 3 ? "medium" : "low";
      const task = await createTask({ title: step.title, content: step.description, folder_id: folder.id, priority, scheduled_date: isToday ? today : null });
      if (task) createdTasks.push(task);
    }
    const startHour = new Date().getHours() + 1;
    for (let i = 0; i < Math.min(createdTasks.length, 3); i++) {
      const task = createdTasks[i];
      await createBlock({
        title: task.title,
        time: `${String(startHour + i).padStart(2, "0")}:00`,
        duration: "60 min",
        type: "focus",
        task_id: task.id,
      });
    }
    setActiveFolder(folder.id);
    setActiveView("focus");
    toast.success(`Plan created: ${createdTasks.length} tasks in "${folderName}"`);
  }, [createTask, createFolder, createBlock, setActiveFolder, setActiveView]);

  const handleCreateFolder = useCallback(async (data: { title: string; color: string | null; icon: string; subfolders?: string[] }) => {
    const folder = await createFolder({ title: data.title, type: "project", color: data.color, icon: data.icon });
    if (folder) {
      setActiveFolder(folder.id);
      setShowCreateModal(false);
    }
  }, [createFolder, setActiveFolder]);

  const effectiveView = billingOpen ? "billing" : activeView;

  return (
    <motion.div
      className="relative z-10 flex min-h-screen w-full">

      {/* Sidebar — smoothly collapses in Focus Mode */}
      <div className="hidden md:block shrink-0">
        <FluxSidebar visible={sidebarVisible && !isFocusModeActive} onToggle={onToggleSidebar} onRequestCreateFolder={() => setShowCreateModal(true)} />
      </div>

      {/* Center stage */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 pb-[64px] md:pb-0 overflow-hidden">

        {/* Control Center trigger button — top right */}
        <div className="absolute top-3 right-3 z-[200] flex items-center gap-2">
          <motion.button
            onClick={() => setControlCenterOpen(p => !p)}
            title="Control Center"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-200 ${
              controlCenterOpen
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-background/40 backdrop-blur-md border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
            }`}
          >
            <SlidersHorizontal size={14} />
          </motion.button>
        </div>

        {/* View switcher */}
        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 flex flex-col h-full min-h-screen"
          >
            {effectiveView === "focus"                       && <FocusDashboardView />}
            {effectiveView === "calendar"                    && <FullCalendarView />}
            {effectiveView === "tasks"                       && <AITaskManager />}
            {effectiveView === "analytics"                   && <AnalyticsView />}
            {effectiveView === "projects"                    && <ProjectsOverview />}
            {effectiveView === "documents"                   && <DocumentsView />}
            {effectiveView === "settings"                    && <SettingsView />}
            {effectiveView === "council"                     && <TheCouncil />}
            {effectiveView === "canvas"                      && <Canvas />}
            {effectiveView === "stream"                      && <GridDashboard />}
            {(effectiveView as string) === "multitask"       && <MultitaskingView />}
            {(effectiveView as string) === "community"       && <CommunityBoardView />}
            {(effectiveView as string) === "community-admin" && <CommunityAdminView />}
            {(effectiveView as string) === "crm"             && <CRMPage />}
            {effectiveView === "billing"                     && <BillingView />}
            {!VIEWS_WITHOUT_SCHEDULER.includes(effectiveView as string) && <Scheduler />}
          </motion.div>
        </AnimatePresence>

        {/* Mobile nav */}
        <MobileNav />
      </div>

      {/* Global Modals */}
      <UpgradeModal />
      <OutOfSparksModal />
      <OnboardingFlow />
      <CreateFolderModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateFolder} />

      {/* Focus Mode Control Bar — global, visible on all views */}
      <FocusControlBar />

      {/* Control Center */}
      <ControlCenter open={controlCenterOpen} onClose={() => setControlCenterOpen(false)} />
    </motion.div>
  );
};

export default Dashboard;
