import React from "react";
import { useFlux } from "@/context/FluxContext";
import { Folder, CheckCircle2, Circle, Plus } from "lucide-react";
import { motion } from "framer-motion";

const ProjectsOverview = () => {
  const { folders, tasks, setActiveFolder, setActiveView } = useFlux();
  const projects = folders.filter(f => f.type === "project" && !f.parent_id);

  const openProject = (id: string) => {
    setActiveFolder(id);
    setActiveView("stream");
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold font-display flex items-center gap-2"><Folder size={22} /> Projects</h2>
        <p className="text-sm text-muted-foreground">All your project folders</p>
      </div>

      {projects.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flux-card text-center py-16">
          <Folder size={32} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold font-display mb-2 text-lg">No projects yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">Create a folder to get started organizing your work.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project, i) => {
            const pTasks = tasks.filter(t => t.folder_id === project.id);
            const done = pTasks.filter(t => t.done).length;
            const total = pTasks.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const subfolders = folders.filter(f => f.parent_id === project.id);

            return (
              <motion.button
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => openProject(project.id)}
                className="flux-card text-left hover:ring-1 hover:ring-primary/30 transition-all"
                style={{ borderLeft: `3px solid ${project.color || "hsl(var(--primary))"}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{project.icon || "📁"}</span>
                  <h3 className="text-sm font-semibold font-display truncate">{project.title}</h3>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {done}/{total} tasks</span>
                  {subfolders.length > 0 && <span>{subfolders.length} subfolders</span>}
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectsOverview;
