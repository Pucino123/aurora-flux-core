import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Lightbulb, Clock, AlertTriangle, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";

const db = supabase as any;

interface Notification {
  id: string;
  type: "neglected" | "contradiction" | "overload" | "review";
  title: string;
  description: string;
  ideaId?: string;
  dismissed: boolean;
}

interface ProactiveIntelligenceProps {
  userId: string;
  onNavigateToIdea?: (ideaId: string) => void;
}

const NOTIFICATION_CONFIG = {
  neglected: { icon: Clock, color: "hsl(45 90% 55%)", bg: "hsl(45 90% 97%)" },
  contradiction: { icon: AlertTriangle, color: "hsl(0 84% 60%)", bg: "hsl(0 84% 97%)" },
  overload: { icon: AlertCircle, color: "hsl(30 90% 55%)", bg: "hsl(30 90% 97%)" },
  review: { icon: Lightbulb, color: "hsl(270 70% 65%)", bg: "hsl(270 70% 97%)" },
};

const ProactiveIntelligence = ({ userId, onNavigateToIdea }: ProactiveIntelligenceProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    analyzeAndNotify();
  }, [userId]);

  const analyzeAndNotify = async () => {
    const notes: Notification[] = [];

    // Check for neglected ideas (no activity in 7+ days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldIdeas } = await db
      .from("council_ideas")
      .select("id, content, updated_at")
      .eq("user_id", userId)
      .lt("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: true })
      .limit(3);

    oldIdeas?.forEach((idea) => {
      notes.push({
        id: `neglect-${idea.id}`,
        type: "neglected",
        title: "Glemt idé",
        description: `"${idea.content.slice(0, 50)}..." har ikke fået opmærksomhed i over en uge.`,
        ideaId: idea.id,
        dismissed: false,
      });
    });

    // Check for overload (10+ active ideas without resolution)
    const { count: activeCount } = await db
      .from("council_ideas")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("consensus_score", null);

    if (activeCount && activeCount > 10) {
      notes.push({
        id: "overload",
        type: "overload",
        title: "Overbelastning detekteret",
        description: `Du har ${activeCount} idéer uden afgørelse. Overvej at prioritere eller arkivere.`,
        dismissed: false,
      });
    }

    // Check for contradicting votes (ideas where all 5 personas disagree strongly)
    const { data: recentIdeas } = await db
      .from("council_ideas")
      .select("id, content, consensus_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Contradiction check removed — handled via Debate Mode in advanced tools

    // Suggest reviewing starred ideas
    const { data: starredIdeas } = await db
      .from("council_ideas")
      .select("id, content")
      .eq("user_id", userId)
      .eq("starred", true)
      .limit(1);

    if (starredIdeas && starredIdeas.length > 0) {
      const idea = starredIdeas[0];
      notes.push({
        id: `review-${idea.id}`,
        type: "review",
        title: "Genbesøg stjernemarkeret idé",
        description: `"${idea.content.slice(0, 45)}..." fortjener en frisk evaluering.`,
        ideaId: idea.id,
        dismissed: false,
      });
    }

    setNotifications(notes.slice(0, 4)); // max 4 notifications
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const visible = notifications.filter((n) => !n.dismissed);
  if (visible.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-1.5"
    >
      {visible.map((notif, i) => {
        const cfg = NOTIFICATION_CONFIG[notif.type];
        const Icon = cfg.icon;

        return (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10, height: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all hover:shadow-sm"
            style={{ backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }}
          >
            <Icon size={14} style={{ color: cfg.color }} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold" style={{ color: cfg.color }}>{notif.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{notif.description}</p>
            </div>
            {notif.ideaId && onNavigateToIdea && (
              <button
                onClick={() => onNavigateToIdea(notif.ideaId!)}
                className="p-1 rounded-md hover:bg-black/5 transition-colors shrink-0"
              >
                <ChevronRight size={12} style={{ color: cfg.color }} />
              </button>
            )}
            <button
              onClick={() => dismiss(notif.id)}
              className="p-1 rounded-md hover:bg-black/5 transition-colors shrink-0"
            >
              <X size={10} className="text-muted-foreground" />
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ProactiveIntelligence;
