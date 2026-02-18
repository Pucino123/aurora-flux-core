import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import InputBar from "./InputBar";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/lib/i18n";

interface LandingPageProps {
  onEnter: (text: string) => void;
}

const LandingPage = ({ onEnter }: LandingPageProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleEnter = (text: string) => {
    if (!user) {
      sessionStorage.setItem("flux_pending_prompt", text);
      navigate("/auth");
    } else {
      onEnter(text);
    }
  };

  return (
    <motion.div
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Sign in button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate("/auth")}
        className="fixed top-6 right-8 z-50 text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
      >
        {t("app.signin")}
      </motion.button>

      {/* Pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="glass-pill text-xs font-medium text-primary cursor-pointer hover:bg-white/70 transition-colors"
      >
        {t("app.pill")}
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-5xl md:text-6xl font-bold tracking-tight text-foreground mt-6 mb-3 text-center font-display"
      >
        {t("app.headline")}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-base md:text-lg text-muted-foreground mb-10 text-center"
      >
        {t("app.tagline")}
      </motion.p>

      {/* Input Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <InputBar onSubmit={handleEnter} />
      </motion.div>

      {/* Subtle hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="mt-8 text-xs text-muted-foreground/60"
      >
        {t("app.hint")}
      </motion.p>
    </motion.div>
  );
};

export default LandingPage;
