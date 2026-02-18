import { motion } from "framer-motion";
import { Star, ChevronRight, Trash2 } from "lucide-react";
import { t } from "@/lib/i18n";

interface IdeaSummary {
  id: string;
  content: string;
  consensus_score: number | null;
  starred: boolean;
  created_at: string;
}

interface CouncilIdeasListProps {
  ideas: IdeaSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onDelete?: (id: string) => void;
}

const CouncilIdeasList = ({ ideas, activeId, onSelect, onToggleStar, onDelete }: CouncilIdeasListProps) => {
  if (ideas.length === 0) return null;

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 7) return "text-[hsl(150_60%_45%)]";
    if (score >= 3) return "text-[hsl(150_60%_55%)]";
    if (score >= 0) return "text-[hsl(45_90%_55%)]";
    if (score >= -3) return "text-[hsl(30_90%_55%)]";
    return "text-destructive";
  };

  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        {t("council.history")}
      </h3>
      <div className="space-y-1 max-h-[300px] overflow-y-auto council-hidden-scrollbar">
        {ideas.map((idea) => (
          <motion.button
            key={idea.id}
            onClick={() => onSelect(idea.id)}
            whileHover={{ x: 2 }}
            className={`group w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
              activeId === idea.id ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onToggleStar(idea.id, !idea.starred); }}
              className="shrink-0"
            >
              <Star size={12} className={idea.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"} />
            </button>
            <span className="flex-1 truncate">{idea.content.slice(0, 60)}{idea.content.length > 60 ? "..." : ""}</span>
            {idea.consensus_score !== null && (
              <span className={`text-[10px] font-bold ${getScoreColor(idea.consensus_score)}`}>
                {idea.consensus_score > 0 ? "+" : ""}{idea.consensus_score}
              </span>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(idea.id); }}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            )}
            <ChevronRight size={12} className="text-muted-foreground/30 shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CouncilIdeasList;
