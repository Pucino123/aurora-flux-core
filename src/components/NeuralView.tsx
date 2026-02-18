import { useMemo } from "react";
import { motion } from "framer-motion";
import { useFlux, FolderNode } from "@/context/FluxContext";
import { t } from "@/lib/i18n";
import { Folder, FileText, Target, Dumbbell, Wallet, ChevronRight } from "lucide-react";

const typeConfig: Record<string, { icon: typeof Folder; gradient: string; border: string; badge: string }> = {
  project: { icon: Folder, gradient: "from-blue-500/15 to-blue-600/5", border: "border-blue-500/30", badge: "bg-blue-500/20 text-blue-300" },
  area: { icon: Target, gradient: "from-violet-500/15 to-violet-600/5", border: "border-violet-500/30", badge: "bg-violet-500/20 text-violet-300" },
  notes: { icon: FileText, gradient: "from-pink-500/15 to-pink-600/5", border: "border-pink-500/30", badge: "bg-pink-500/20 text-pink-300" },
  fitness: { icon: Dumbbell, gradient: "from-emerald-500/15 to-emerald-600/5", border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300" },
  finance: { icon: Wallet, gradient: "from-amber-500/15 to-amber-600/5", border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-300" },
};

const defaultConfig = typeConfig.project;

interface ClusterProps {
  node: FolderNode;
  onNavigate: (id: string) => void;
  depth?: number;
}

const ClusterCard = ({ node, onNavigate, depth = 0 }: ClusterProps) => {
  const cfg = typeConfig[node.type] || defaultConfig;
  const Icon = cfg.icon;
  const hasContent = node.tasks.length > 0 || node.children.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: depth * 0.05 }}
      className="w-full"
    >
      {/* Cluster header */}
      <button
        onClick={() => onNavigate(node.id)}
        className={`w-full text-left rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.gradient} backdrop-blur-sm p-4 hover:scale-[1.01] transition-all duration-200 group`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl ${cfg.badge} flex items-center justify-center`}>
              <Icon size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground font-display">{node.title}</h3>
              <p className="text-[11px] text-muted-foreground">
                {node.tasks.length} {t("neural.items")} · {node.type}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Item cards inside cluster */}
        {node.tasks.length > 0 && (
          <div className="space-y-1.5">
            {node.tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/40 border border-border/30 text-xs"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.done ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
                <span className={`truncate ${task.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </span>
                {task.priority === "high" && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 shrink-0">!</span>
                )}
              </div>
            ))}
            {node.tasks.length > 4 && (
              <p className="text-[10px] text-muted-foreground pl-3">+{node.tasks.length - 4} {t("neural.items")}</p>
            )}
          </div>
        )}
      </button>

      {/* Nested children */}
      {node.children.length > 0 && (
        <div className="ml-4 mt-2 pl-4 border-l border-border/30 space-y-2">
          {node.children.map((child) => (
            <ClusterCard key={child.id} node={child} onNavigate={onNavigate} depth={depth + 1} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

const NeuralView = () => {
  const { folderTree, setActiveFolder, setActiveView } = useFlux();

  const handleNavigate = (id: string) => {
    setActiveFolder(id);
    setActiveView("canvas");
  };

  // Group top-level folders by type for clustering
  const clusters = useMemo(() => {
    const groups: Record<string, FolderNode[]> = {};
    for (const node of folderTree) {
      const type = node.type || "project";
      if (!groups[type]) groups[type] = [];
      groups[type].push(node);
    }
    return groups;
  }, [folderTree]);

  if (folderTree.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center text-muted-foreground text-sm glass-panel rounded-2xl">
        {t("neural.empty")}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full min-h-[400px] overflow-y-auto rounded-2xl glass-panel p-5 space-y-6"
    >
      {Object.entries(clusters).map(([type, nodes]) => {
        const cfg = typeConfig[type] || defaultConfig;
        const Icon = cfg.icon;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`w-5 h-5 rounded-md ${cfg.badge} flex items-center justify-center`}>
                <Icon size={12} />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {type}
              </h2>
              <span className="text-[10px] text-muted-foreground/60">({nodes.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nodes.map((node) => (
                <ClusterCard key={node.id} node={node} onNavigate={handleNavigate} />
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
};

export default NeuralView;
