import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import skyBg from "@/assets/bg-sky-hero.jpg";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#87CEEB" }}>
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

  const inputClass = `
    w-full px-4 py-3.5 rounded-2xl
    bg-white/20 backdrop-blur-sm
    border border-white/30
    text-slate-800 placeholder:text-slate-500/70
    text-sm outline-none
    focus:border-sky-400/60 focus:ring-2 focus:ring-sky-300/20
    transition-all
  `;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Sky background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${skyBg})` }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-sky-300/20 via-transparent to-sky-500/20" />

      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-white/90 hover:text-white font-medium text-sm transition-colors drop-shadow-md bg-white/20 backdrop-blur border border-white/30 px-4 py-2 rounded-full"
      >
        <ArrowLeft size={14} /> Back
      </motion.button>

      {/* Logo */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <span className="text-xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>Flux</span>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div
          className="rounded-[2rem] p-8 md:p-10 shadow-[0_24px_80px_rgba(0,60,130,0.20)]"
          style={{
            background: "rgba(255,255,255,0.42)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.65)",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-3xl md:text-4xl font-bold text-slate-800 mb-2"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm text-slate-600">
              {isSignUp
                ? "Start your productivity journey with Flux"
                : "Sign in to your Flux workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass + " pr-11"}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 mt-1"
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/40" />
            <span className="text-xs text-slate-500 font-medium">or</span>
            <div className="flex-1 h-px bg-white/40" />
          </div>

          <p className="text-center text-sm text-slate-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sky-600 hover:text-sky-700 font-semibold hover:underline transition-colors"
            >
              {isSignUp ? "Sign in" : "Sign up free"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
