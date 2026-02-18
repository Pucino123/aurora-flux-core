import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import AuroraBackground from "@/components/AuroraBackground";
import { t } from "@/lib/i18n";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AuroraBackground />
      <div className="relative z-10 animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (isSignUp) {
      const { error } = await signUp(email, password, displayName || email.split("@")[0]);
      if (error) toast.error(error.message);
      else toast.success(t("auth.check_email"));
    } else {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-4">
      <AuroraBackground />

      {/* Back to landing */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate("/")}
        className="fixed top-6 left-8 z-50 text-muted-foreground hover:text-foreground font-medium text-sm transition-colors"
      >
        ← Back
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/50 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-2">
              {isSignUp ? t("auth.join") : t("auth.welcome")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? t("auth.create_desc") : t("auth.signin_desc")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.display_name")}</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 text-sm outline-none focus:border-[hsl(var(--aurora-blue))]/40 focus:ring-2 focus:ring-[hsl(var(--aurora-blue))]/10 transition-all placeholder:text-muted-foreground/50"
                  placeholder={t("auth.name_placeholder")}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 text-sm outline-none focus:border-[hsl(var(--aurora-blue))]/40 focus:ring-2 focus:ring-[hsl(var(--aurora-blue))]/10 transition-all placeholder:text-muted-foreground/50"
                placeholder={t("auth.email_placeholder")}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("auth.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 text-sm outline-none focus:border-[hsl(var(--aurora-blue))]/40 focus:ring-2 focus:ring-[hsl(var(--aurora-blue))]/10 transition-all placeholder:text-muted-foreground/50"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[hsl(var(--aurora-blue))] to-[hsl(var(--aurora-violet))] text-white font-semibold text-sm hover:shadow-lg hover:shadow-[hsl(var(--aurora-blue))]/20 transition-all disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  {isSignUp ? t("auth.creating") : t("auth.signing_in")}
                </span>
              ) : isSignUp ? t("auth.create_account") : t("auth.sign_in")}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isSignUp ? t("auth.has_account") : t("auth.no_account")}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-[hsl(var(--aurora-blue))] hover:underline font-medium">
              {isSignUp ? t("auth.signin_link") : t("auth.signup_link")}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
