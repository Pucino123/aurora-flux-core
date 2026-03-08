import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { Eye, EyeOff, ArrowLeft, Sparkles, Sun, Moon } from "lucide-react";
import gradientBg from "@/assets/bg-gradient.png";
import SEO from "@/components/SEO";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const isDark = theme === "dark";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${cherryBg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
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

  // Apple-style dark: very dark desaturated overlay over blurred bg
  const bgOverlay = isDark
    ? "rgba(10,10,14,0.72)"
    : "rgba(255,255,255,0.10)";

  // Card glass
  const cardBg = isDark
    ? "rgba(28,28,32,0.78)"
    : "rgba(255,255,255,0.22)";
  const cardBorder = isDark
    ? "1.5px solid rgba(255,255,255,0.10)"
    : "1.5px solid rgba(255,255,255,0.55)";
  const cardShadow = isDark
    ? "0 32px 80px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset"
    : "0 32px 80px rgba(80,120,200,0.18), 0 2px 0 rgba(255,255,255,0.35) inset";

  // Input fields — solid dark/white so text is always readable
  const inputBg = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.90)";
  const inputBorder = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.10)";
  const inputText = isDark ? "#f1f1f3" : "#0f172a";
  const inputPlaceholder = isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.35)";

  // Label
  const labelColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.60)";

  // Submit button
  const btnBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.92)";
  const btnColor = isDark ? "#ffffff" : "#1e293b";
  const btnBorder = isDark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.5)";

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      <SEO
        title={isSignUp ? "Create Account" : "Sign In"}
        description="Sign in to your Dashiii workspace — your AI-powered productivity hub."
        url="/auth"
        keywords="login, sign up, Dashiii workspace, AI productivity app"
      />
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center scale-110 transition-all duration-700"
        style={{ backgroundImage: `url(${cherryBg})`, filter: isDark ? "blur(22px) brightness(0.45) saturate(0.6)" : "blur(18px)" }} />
      {/* Overlay */}
      <div className="fixed inset-0 z-0 transition-colors duration-700" style={{ background: bgOverlay }} />

      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium bg-white/10 backdrop-blur border border-white/20 px-4 py-2 rounded-full transition-all hover:bg-white/20 shadow-sm"
      >
        <ArrowLeft size={13} /> Back
      </motion.button>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <span className="text-2xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>Dashiii</span>
      </motion.div>

      {/* Dark mode toggle */}
      <motion.button
        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="fixed top-6 right-6 z-50 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-all shadow-sm"
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </motion.button>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] mt-10"
      >
        {/* Pill badge */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur border border-white/20 text-white text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-sm">
            <Sparkles size={10} className="text-yellow-300" />
            AI-powered productivity
          </div>
        </div>

        <div className="rounded-[2rem] p-8 md:p-10 transition-all duration-500"
          style={{ background: cardBg, backdropFilter: "blur(48px) saturate(180%)", WebkitBackdropFilter: "blur(48px) saturate(180%)", border: cardBorder, boxShadow: cardShadow }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.65)" }}>
              {isSignUp ? "Start your productivity journey with Dashiii" : "Sign in to your Dashiii workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-widest" style={{ color: labelColor }}>Name</label>
                <input
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all shadow-sm"
                  style={{ background: inputBg, border: inputBorder, color: inputText }}
                  placeholder="Your name"
                  onFocus={e => e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(99,179,237,0.7)"}
                  onBlur={e => e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-widest" style={{ color: labelColor }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none transition-all shadow-sm"
                style={{ background: inputBg, border: inputBorder, color: inputText }}
                placeholder="you@example.com"
                onFocus={e => e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(99,179,237,0.7)"}
                onBlur={e => e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold mb-1.5 block uppercase tracking-widest" style={{ color: labelColor }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={6}
                  className="w-full px-4 py-3.5 pr-11 rounded-2xl text-sm outline-none transition-all shadow-sm"
                  style={{ background: inputBg, border: inputBorder, color: inputText }}
                  placeholder="••••••••"
                  onFocus={e => e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(99,179,237,0.7)"}
                  onBlur={e => e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.4)" }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={submitting}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 mt-2 shadow-lg"
              style={{ background: btnBg, color: btnColor, border: btnBorder, backdropFilter: isDark ? "blur(8px)" : "none" }}
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 rounded-full"
                    style={{ borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(30,41,59,0.2)", borderTopColor: isDark ? "white" : "#1e293b" }} />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : isSignUp ? "Create account" : "Sign in"}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.25)" }} />
            <span className="text-xs font-medium" style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.45)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.25)" }} />
          </div>

          <p className="text-center text-sm" style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.65)" }}>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-white font-bold hover:underline transition-colors">
              {isSignUp ? "Sign in" : "Sign up free"}
            </button>
          </p>
        </div>

        <p className="text-center text-[11px] mt-5" style={{ color: "rgba(255,255,255,0.30)" }}>
          By signing up you agree to our terms. No credit card required.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
