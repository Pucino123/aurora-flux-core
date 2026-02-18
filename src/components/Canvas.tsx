import { useFlux } from "@/context/FluxContext";
import ProjectBoard from "./ProjectBoard";
import FitnessTracker from "./FitnessTracker";
import InboxView from "./InboxView";
import { motion } from "framer-motion";

const FITNESS_TYPES = ["fitness", "health"];
const FINANCE_TYPES = ["finance"];

const Canvas = () => {
  const { activeFolder, findFolderNode } = useFlux();

  if (activeFolder === null) {
    return <InboxView />;
  }

  const folder = findFolderNode(activeFolder);
  if (!folder) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Folder not found
      </div>
    );
  }

  const isFitness =
    FITNESS_TYPES.includes(folder.type) ||
    /training|workout|habits|health|gym|træning/i.test(folder.title);

  const isFinance =
    FINANCE_TYPES.includes(folder.type) ||
    /finance|budget|økonomi|opsparing|savings|economy/i.test(folder.title);

  if (isFitness) {
    return (
      <motion.div key={folder.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <FitnessTracker folderId={folder.id} />
      </motion.div>
    );
  }

  if (isFinance) {
    return (
      <motion.div key={folder.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <ProjectBoard folderId={folder.id} />
      </motion.div>
    );
  }

  return (
    <motion.div key={folder.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      <ProjectBoard folderId={folder.id} />
    </motion.div>
  );
};

export default Canvas;
