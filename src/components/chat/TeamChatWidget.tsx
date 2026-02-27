import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useTeamChat } from "@/hooks/useTeamChat";
import CollabMessagesModal from "@/components/focus/CollabMessagesModal";

const TeamChatWidget = () => {
  const { hasTeams, messages, loading } = useTeamChat();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
          >
            <MessageSquare size={20} />
            {hasTeams && messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Full Colab Modal */}
      <CollabMessagesModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default TeamChatWidget;
