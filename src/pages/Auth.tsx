import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import { Eye, EyeOff, ArrowLeft, Sparkles } from "lucide-react";
import cherryBg from "@/assets/bg-cherry-blossom.jpg";

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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${cherryBg})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(0)" }}>
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

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Blurred cherry blossom background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center scale-110" style={{ backgroundImage: `url(${cherryBg})`, filter: "blur(18px)" }} />
      <div className="fixed inset-0 z-0 bg-white/10 pointer-events-none" />

      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium bg-white/20 backdrop-blur border border-white/35 px-4 py-2 rounded-full transition-all hover:bg-white/30 shadow-sm"
      >
        <ArrowLeft size={13} /> Back
      </motion.button>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <span className="text-2xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "Georgia, serif" }}>Flux</span>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] mt-10"
      >
        {/* Pill badge */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur border border-white/35 text-white text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-sm">
            <Sparkles size={10} className="text-yellow-200" />
            AI-powered productivity
          </div>
        </div>

        <div
          className="rounded-[2rem] p-8 md:p-10"
          style={{
            background: "rgba(255,255,255,0.22)",
            backdropFilter: "blur(48px) saturate(180%)",
            WebkitBackdropFilter: "blur(48px) saturate(180%)",
            border: "1.5px solid rgba(255,255,255,0.55)",
            boxShadow: "0 32px 80px rgba(80,120,200,0.18), 0 2px 0 rgba(255,255,255,0.35) inset",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm text-white/65">
              {isSignUp ? "Start your productivity journey with Flux" : "Sign in to your Flux workspace"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-[11px] font-semibold text-white/60 mb-1.5 block uppercase tracking-widest">Name</label>
                <input
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl text-white placeholder:text-white/35 text-sm outline-none transition-all shadow-sm"
                  style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)" }}
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-white/60 mb-1.5 block uppercase tracking-widest">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3.5 rounded-2xl text-white placeholder:text-white/35 text-sm outline-none transition-all shadow-sm"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)" }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-white/60 mb-1.5 block uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={6}
                  className="w-full px-4 py-3.5 pr-11 rounded-2xl text-white placeholder:text-white/35 text-sm outline-none transition-all shadow-sm"
                  style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.3)" }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={submitting}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 mt-2 shadow-lg"
              style={{ background: "rgba(255,255,255,0.92)", color: "#1e293b", border: "1px solid rgba(255,255,255,0.5)" }}
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full" />
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
              ) : isSignUp ? "Create account" : "Sign in"}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/25" />
            <span className="text-xs text-white/40 font-medium">or</span>
            <div className="flex-1 h-px bg-white/25" />
          </div>

          <p className="text-center text-sm text-white/65">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-white font-bold hover:underline transition-colors">
              {isSignUp ? "Sign in" : "Sign up free"}
            </button>
          </p>
        </div>

        <p className="text-center text-white/35 text-[11px] mt-5">
          By signing up you agree to our terms. No credit card required.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
