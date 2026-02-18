import React, { useState, useCallback, useRef } from "react";
import { useFocusStore } from "@/context/FocusContext";
import { ChevronDown, Image, Upload, Plus, X, Palette, Save, Link, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

// ── Background images (ES6 imports) ──────────────────────────────────
import bgCozyFireplace from "@/assets/bg-cozy-fireplace.jpg";
import bgCozyLibrary from "@/assets/bg-cozy-library.jpg";
import bgNatureOcean from "@/assets/bg-nature-ocean.jpg";
import bgNatureForest from "@/assets/bg-nature-forest.jpg";
import bgNatureRain from "@/assets/bg-nature-rain.jpg";
import bgUrbanTokyo from "@/assets/bg-urban-tokyo.jpg";
import bgUrbanCafe from "@/assets/bg-urban-cafe.jpg";
import bgScenicBeach from "@/assets/bg-scenic-beach.jpg";
import bgScenicSakura from "@/assets/bg-scenic-sakura.jpg";
import bgScenicClouds from "@/assets/bg-scenic-clouds.jpg";

// ── Types ────────────────────────────────────────────────────────────
interface BgEntry {
  id: string;
  label: string;
  category: string;
  type?: "image" | "gradient" | "video";
  src?: string;
  videoSrc?: string;
  youtubeId?: string;
  colors?: [string, string, string];
}

// ── YouTube-based live video backgrounds ──────────────
const YOUTUBE_VIDEOS: Record<string, string> = {
  "cozy-fireplace": "8myYyMg1fFE",
  "cozy-library":   "Y1-5LGl0VrE",
  "nature-rain":    "meMx0AtKt2I",
  "nature-ocean":   "JdqL89ZZwFw",
  "urban-tokyo":    "e5pGt1-Wy04",
  "nature-forest":  "Pnh6641BY2M",
};

const BACKGROUNDS: BgEntry[] = [
  { id: "cozy-fireplace", label: "Rainforest",       category: "Nature", type: "video", src: `https://img.youtube.com/vi/${YOUTUBE_VIDEOS["cozy-fireplace"]}/maxresdefault.jpg`, youtubeId: YOUTUBE_VIDEOS["cozy-fireplace"] },
  { id: "cozy-library",   label: "Fireplace",         category: "Cozy",   type: "video", src: `https://img.youtube.com/vi/${YOUTUBE_VIDEOS["cozy-library"]}/maxresdefault.jpg`,   youtubeId: YOUTUBE_VIDEOS["cozy-library"] },
  { id: "nature-rain",    label: "Riverside Cabin",   category: "Nature", type: "video", src: `https://img.youtube.com/vi/${YOUTUBE_VIDEOS["nature-rain"]}/maxresdefault.jpg`,    youtubeId: YOUTUBE_VIDEOS["nature-rain"] },
  { id: "nature-ocean",   label: "Lofi Chill",        category: "Nature", type: "video", src: `https://img.youtube.com/vi/${YOUTUBE_VIDEOS["nature-ocean"]}/maxresdefault.jpg`,   youtubeId: YOUTUBE_VIDEOS["nature-ocean"] },
  { id: "urban-tokyo",    label: "Tokyo Night",       category: "Urban",  type: "video", src: `https://img.youtube.com/vi/${YOUTUBE_VIDEOS["urban-tokyo"]}/maxresdefault.jpg`,    youtubeId: YOUTUBE_VIDEOS["urban-tokyo"] },
  { id: "nature-forest",  label: "Medieval Fantasy",  category: "Nature", type: "video", src: `https://img.youtube.com/vi/${YOUTUBE_VIDEOS["nature-forest"]}/maxresdefault.jpg`,  youtubeId: YOUTUBE_VIDEOS["nature-forest"] },
  // Image-only backgrounds
  { id: "urban-cafe",     label: "Street Café",     category: "Urban",  type: "image", src: bgUrbanCafe },
  { id: "scenic-beach",   label: "Tropical Beach",  category: "Scenic", type: "image", src: bgScenicBeach },
  { id: "scenic-sakura",  label: "Cherry Blossom",  category: "Scenic", type: "image", src: bgScenicSakura },
  { id: "cine-clouds",    label: "Soft Clouds",     category: "Scenic", type: "image", src: bgScenicClouds },
  // Aurora / Gradient backgrounds
  { id: "aurora-northern", label: "Northern Lights", category: "Aurora", type: "gradient", colors: ["210 90% 50%", "160 70% 45%", "270 60% 55%"] },
  { id: "aurora-sunset",   label: "Sunset Glow",     category: "Aurora", type: "gradient", colors: ["25 90% 55%", "340 80% 60%", "300 70% 50%"] },
  { id: "aurora-ocean",    label: "Deep Ocean",       category: "Aurora", type: "gradient", colors: ["185 80% 40%", "220 70% 30%", "195 90% 55%"] },
  { id: "aurora-cosmic",   label: "Cosmic",           category: "Aurora", type: "gradient", colors: ["270 70% 50%", "240 60% 40%", "330 70% 55%"] },
  { id: "aurora-mint",     label: "Soft Mint",        category: "Aurora", type: "gradient", colors: ["160 50% 70%", "270 40% 75%", "0 0% 92%"] },
  { id: "aurora-ember",    label: "Ember",            category: "Aurora", type: "gradient", colors: ["10 85% 50%", "35 90% 55%", "350 75% 45%"] },
  { id: "aurora-twilight", label: "Twilight",         category: "Aurora", type: "gradient", colors: ["240 50% 35%", "280 60% 45%", "200 70% 50%"] },
  { id: "aurora-rose",     label: "Rose Gold",        category: "Aurora", type: "gradient", colors: ["345 60% 65%", "20 50% 70%", "330 40% 55%"] },
  { id: "aurora-forest",   label: "Enchanted",        category: "Aurora", type: "gradient", colors: ["140 60% 35%", "170 50% 40%", "100 40% 50%"] },
  { id: "aurora-neon",     label: "Neon Pulse",       category: "Aurora", type: "gradient", colors: ["300 90% 55%", "180 90% 50%", "60 90% 55%"] },
];

const CATEGORIES = ["Cozy", "Nature", "Urban", "Scenic", "Aurora", "Custom"];

// ── Custom backgrounds (localStorage) ────────────────────────────────
interface CustomBg { id: string; label: string; url: string; type: "video" | "image" | "youtube"; youtubeId?: string; }
const CUSTOM_BG_KEY = "flux-custom-backgrounds";
function loadCustomBgs(): CustomBg[] { try { const raw = localStorage.getItem(CUSTOM_BG_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveCustomBgs(bgs: CustomBg[]) { localStorage.setItem(CUSTOM_BG_KEY, JSON.stringify(bgs)); }

// ── Custom gradients (localStorage) ──────────────────────────────────
interface CustomGrad { id: string; label: string; colors: [string, string, string]; }
const CUSTOM_GRAD_KEY = "flux-custom-gradients";
function loadCustomGrads(): CustomGrad[] { try { const raw = localStorage.getItem(CUSTOM_GRAD_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; } }
function saveCustomGrads(grads: CustomGrad[]) { localStorage.setItem(CUSTOM_GRAD_KEY, JSON.stringify(grads)); }

// ── Color helpers ────────────────────────────────────────────────────
function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) { case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break; case g: h = ((b - r) / d + 2) / 6; break; case b: h = ((r - g) / d + 4) / 6; break; }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ── Image Background (with Ken Burns) ────────────────────────────────
const ImageBackground = React.memo(({ imageUrl }: { imageUrl: string }) => (
  <>
    <div className="absolute inset-0 overflow-hidden"><img src={imageUrl} alt="" className="w-full h-full object-cover animate-ken-burns" /></div>
    <div className="absolute inset-0 bg-black/20" />
  </>
));

// ── YouTube Background ─────────────────────────────────────────────
const YouTubeBackground = React.memo(({ youtubeId, posterUrl, volume = 0 }: { youtubeId: string; posterUrl?: string; volume?: number }) => {
  const [loaded, setLoaded] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&enablejsapi=1&vq=hd1080&origin=${window.location.origin}`;

  React.useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !loaded) return;
    try {
      const vol = Math.round(Math.max(0, Math.min(100, volume * 100)));
      if (vol > 0) iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "unMute", args: [] }), "*");
      iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [vol] }), "*");
    } catch {}
  }, [volume, loaded]);

  return (
    <>
      {posterUrl && !loaded && <div className="absolute inset-0 bg-black"><img src={posterUrl} alt="" className="w-full h-full object-cover" /></div>}
      <div className="absolute inset-0 overflow-hidden bg-black" style={{ pointerEvents: "none" }}>
        <iframe ref={iframeRef} src={embedUrl} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ width: "177.78vh", height: "100vh", minWidth: "100vw", minHeight: "56.25vw", border: "none" }}
          allow="autoplay; encrypted-media" allowFullScreen={false} onLoad={() => setLoaded(true)} title="Background video" />
      </div>
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
    </>
  );
});

// ── Gradient Background ──────────────────────────────────────────────
const GradientBackground = React.memo(({ colors }: { colors: [string, string, string] }) => (
  <div className="absolute inset-0 overflow-hidden bg-black">
    <div className="absolute -top-[10vh] -left-[5vw] w-[70vw] h-[70vh] rounded-full blur-[150px] animate-aurora-1 will-change-transform" style={{ background: `hsl(${colors[0]} / 0.35)` }} />
    <div className="absolute -bottom-[10vh] -right-[5vw] w-[65vw] h-[65vh] rounded-full blur-[150px] animate-aurora-2 will-change-transform" style={{ background: `hsl(${colors[1]} / 0.3)` }} />
    <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vh] rounded-full blur-[150px] animate-aurora-3 will-change-transform" style={{ background: `hsl(${colors[2]} / 0.25)` }} />
  </div>
));

const GradientThumbnail = ({ colors }: { colors: [string, string, string] }) => (
  <div className="w-full h-full" style={{ background: `linear-gradient(135deg, hsl(${colors[0]}), hsl(${colors[1]}), hsl(${colors[2]}))` }} />
);

const InteractiveGlowLayer = ({ mouseX, mouseY }: { mouseX: number; mouseY: number }) => (
  <div className="absolute inset-0 z-[2] pointer-events-none transition-opacity duration-700"
    style={{ background: mouseX > 0 ? `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, hsla(260, 80%, 65%, 0.06), transparent 60%)` : "none" }} />
);

// ── Custom Gradient Creator ──────────────────────────────────────────
const CustomGradientCreator = ({ onSave, onCancel }: { onSave: (grad: CustomGrad) => void; onCancel: () => void }) => {
  const [colors, setColors] = useState<[string, string, string]>(["#6366f1", "#ec4899", "#8b5cf6"]);
  const [label, setLabel] = useState("My Gradient");
  const hslColors: [string, string, string] = [hexToHsl(colors[0]), hexToHsl(colors[1]), hexToHsl(colors[2])];

  return (
    <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="text-[11px] text-white/50 font-medium uppercase tracking-wider mb-3">Create Gradient</div>
      <div className="h-16 rounded-lg overflow-hidden mb-3 border border-white/10"><GradientThumbnail colors={hslColors} /></div>
      <div className="flex gap-3 mb-3">
        {colors.map((c, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <input type="color" value={c} onChange={(e) => { const next = [...colors] as [string, string, string]; next[i] = e.target.value; setColors(next); }}
              className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-white/20 [&::-webkit-color-swatch]:border" />
            <span className="text-[9px] text-white/30">Color {i + 1}</span>
          </div>
        ))}
      </div>
      <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={20} placeholder="Gradient name..."
        className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-[11px] px-2.5 py-1.5 mb-3 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/20" />
      <div className="flex gap-2">
        <button onClick={() => onSave({ id: `custom-grad-${Date.now()}`, label: label || "Custom", colors: hslColors })}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-white text-[11px] font-medium hover:bg-white/20 transition-all"><Save size={11} /> Save</button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-[11px] font-medium hover:bg-white/10 transition-all">Cancel</button>
      </div>
    </div>
  );
};

// ── YouTube helper ───────────────────────────────────────────────────
function extractYouTubeId(input: string): string | null {
  const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/];
  for (const p of patterns) { const m = input.trim().match(p); if (m) return m[1]; }
  return null;
}

// ── Custom Upload Section ────────────────────────────────────────────
const CustomUploadSection = ({ customBgs, onUpload, onAddYoutube, onDelete, onSelect, currentBg }: {
  customBgs: CustomBg[]; onUpload: (file: File) => void; onAddYoutube: (youtubeId: string, label: string) => void; onDelete: (id: string) => void; onSelect: (id: string) => void; currentBg: string;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytLabel, setYtLabel] = useState("");
  const [showYtInput, setShowYtInput] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setUploading(true); await onUpload(file); setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleAddYoutube = () => { const id = extractYouTubeId(ytUrl); if (!id) return; onAddYoutube(id, ytLabel.trim() || `YouTube ${id.slice(0, 5)}`); setYtUrl(""); setYtLabel(""); setShowYtInput(false); };

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-white/50 font-medium uppercase tracking-wider">Your Backgrounds</span>
        <div className="flex gap-1.5">
          <button onClick={() => setShowYtInput(!showYtInput)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-[10px] transition-all"><Link size={10} /> YouTube</button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 text-[10px] transition-all disabled:opacity-50">
            {uploading ? <span className="animate-pulse">...</span> : <><Plus size={10} /> File</>}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      </div>
      <AnimatePresence>
        {showYtInput && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2">
            <div className="space-y-1.5">
              <input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="Paste YouTube URL..."
                className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-[11px] px-2.5 py-1.5 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
                onKeyDown={(e) => e.key === "Enter" && handleAddYoutube()} />
              <div className="flex gap-1.5">
                <input value={ytLabel} onChange={(e) => setYtLabel(e.target.value)} placeholder="Name (optional)..." maxLength={30}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg text-white text-[11px] px-2.5 py-1.5 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
                  onKeyDown={(e) => e.key === "Enter" && handleAddYoutube()} />
                <button onClick={handleAddYoutube} disabled={!extractYouTubeId(ytUrl)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/15 text-white text-[10px] font-medium hover:bg-white/20 transition-all disabled:opacity-30">Add</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {customBgs.length === 0 && !showYtInput && (
        <div className="text-center py-4 text-white/30 text-[10px]"><Upload size={16} className="mx-auto mb-1 opacity-50" />Upload video/image or paste YouTube URL</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {customBgs.map((bg) => (
          <div key={bg.id} className="relative group">
            <button onClick={() => onSelect(bg.id)} className={`relative rounded-xl overflow-hidden h-20 w-full border-2 transition-all ${currentBg === bg.id ? "border-white/60 ring-2 ring-white/30" : "border-transparent hover:border-white/30"}`}>
              {bg.type === "youtube" ? <img src={`https://img.youtube.com/vi/${bg.youtubeId}/mqdefault.jpg`} alt={bg.label} className="w-full h-full object-cover" />
                : bg.type === "video" ? <video src={bg.url} className="w-full h-full object-cover" muted preload="metadata" />
                : <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 flex items-center justify-between">
                <span className="text-[10px] text-white/80 font-medium">{bg.label}</span>
                {bg.type === "youtube" && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-[8px] font-semibold text-white/90 uppercase tracking-wider">Live</span></span>}
              </div>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(bg.id); }} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={10} /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────
const BackgroundEngine = ({ embedded = false, onMouseMove }: { embedded?: boolean; onMouseMove?: (e: React.MouseEvent) => void }) => {
  const { currentBackground, setCurrentBackground, isZenMode } = useFocusStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [customBgs, setCustomBgs] = useState<CustomBg[]>(loadCustomBgs);
  const [customGrads, setCustomGrads] = useState<CustomGrad[]>(loadCustomGrads);
  const [showGradCreator, setShowGradCreator] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [youtubeVolume, setYoutubeVolume] = useState(() => { try { return parseFloat(localStorage.getItem("flux-yt-volume") || "0"); } catch { return 0; } });
  const [dimming, setDimming] = useState(() => { try { return parseFloat(localStorage.getItem("flux-bg-dimming") || "0.15"); } catch { return 0.15; } });
  const [bgBlur, setBgBlur] = useState(() => { try { return parseFloat(localStorage.getItem("flux-bg-blur") || "0"); } catch { return 0; } });
  const [vignette, setVignette] = useState(() => { try { return parseFloat(localStorage.getItem("flux-bg-vignette") || "0"); } catch { return 0; } });

  React.useEffect(() => { supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)); }, []);
  React.useEffect(() => {
    const handler = (e: Event) => { setYoutubeVolume((e as CustomEvent).detail as number); };
    window.addEventListener("flux-yt-volume-change", handler);
    return () => window.removeEventListener("flux-yt-volume-change", handler);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => { setMousePos({ x: e.clientX, y: e.clientY }); onMouseMove?.(e); }, [onMouseMove]);

  const isCustom = currentBackground.startsWith("custom-");
  const isCustomGrad = currentBackground.startsWith("custom-grad-");
  const customGrad = isCustomGrad ? customGrads.find(g => g.id === currentBackground) : null;
  const customBg = isCustom && !isCustomGrad ? customBgs.find(b => b.id === currentBackground) : null;
  const builtinBg = !isCustom ? BACKGROUNDS.find(b => b.id === currentBackground) || BACKGROUNDS[0] : null;

  const filteredBgs = selectedCategory === "Custom" ? [] : selectedCategory ? BACKGROUNDS.filter(b => b.category === selectedCategory) : BACKGROUNDS;

  const handleUpload = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const ext = file.name.split(".").pop() || "jpg";
    const id = `custom-${Date.now()}`;
    const label = file.name.replace(/\.[^.]+$/, "").slice(0, 20);
    if (user) {
      const path = `${user.id}/${id}.${ext}`;
      const { error } = await supabase.storage.from("focus-backgrounds").upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("focus-backgrounds").getPublicUrl(path);
        const newBg: CustomBg = { id, label, url: data.publicUrl, type: isVideo ? "video" : "image" };
        const updated = [...customBgs, newBg]; setCustomBgs(updated); saveCustomBgs(updated); setCurrentBackground(id); return;
      }
    }
    const objectUrl = URL.createObjectURL(file);
    const newBg: CustomBg = { id, label, url: objectUrl, type: isVideo ? "video" : "image" };
    const updated = [...customBgs, newBg]; setCustomBgs(updated); saveCustomBgs(updated); setCurrentBackground(id);
  };

  const handleDeleteCustom = async (id: string) => {
    const bg = customBgs.find(b => b.id === id);
    if (bg && user) { await supabase.storage.from("focus-backgrounds").remove([`${user.id}/${id}`]); }
    const updated = customBgs.filter(b => b.id !== id); setCustomBgs(updated); saveCustomBgs(updated);
    if (currentBackground === id) setCurrentBackground("cozy-fireplace");
  };

  const handleSaveGrad = (grad: CustomGrad) => {
    const updated = [...customGrads, grad]; setCustomGrads(updated); saveCustomGrads(updated); setCurrentBackground(grad.id); setShowGradCreator(false);
  };

  const handleAddYoutube = (youtubeId: string, label: string) => {
    const id = `custom-yt-${Date.now()}`;
    const newBg: CustomBg = { id, label, url: "", type: "youtube", youtubeId };
    const updated = [...customBgs, newBg]; setCustomBgs(updated); saveCustomBgs(updated); setCurrentBackground(id);
  };

  const handleDeleteGrad = (id: string) => {
    const updated = customGrads.filter(g => g.id !== id); setCustomGrads(updated); saveCustomGrads(updated);
    if (currentBackground === id) setCurrentBackground("aurora-northern");
  };

  return (
    <>
      <div className={`${embedded ? "absolute" : "fixed"} inset-0 z-0 overflow-hidden`} onMouseMove={handleMouseMove}>
        <AnimatePresence mode="wait">
          <motion.div key={currentBackground} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeInOut" }} className="absolute inset-0">
            {builtinBg?.type === "video" && builtinBg.youtubeId ? (
              <YouTubeBackground youtubeId={builtinBg.youtubeId} posterUrl={builtinBg.src} volume={youtubeVolume} />
            ) : builtinBg?.type === "gradient" && builtinBg.colors ? (
              <GradientBackground colors={builtinBg.colors} />
            ) : builtinBg?.type === "image" && builtinBg.src ? (
              <ImageBackground imageUrl={builtinBg.src} />
            ) : builtinBg?.src ? (
              <ImageBackground imageUrl={builtinBg.src} />
            ) : isCustomGrad && customGrad ? (
              <GradientBackground colors={customGrad.colors} />
            ) : isCustom && customBg ? (
              customBg.type === "youtube" && customBg.youtubeId ? (
                <YouTubeBackground youtubeId={customBg.youtubeId} posterUrl={`https://img.youtube.com/vi/${customBg.youtubeId}/maxresdefault.jpg`} volume={youtubeVolume} />
              ) : customBg.type === "video" ? (
                <video src={customBg.url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <ImageBackground imageUrl={customBg.url} />
              )
            ) : null}
          </motion.div>
        </AnimatePresence>
        <InteractiveGlowLayer mouseX={mousePos.x} mouseY={mousePos.y} />
      </div>

      {/* Dimming + blur + vignette overlay */}
      <div className={`${embedded ? "absolute" : "fixed"} inset-0 z-[1] pointer-events-none transition-all duration-500`}
        style={{ backgroundColor: `rgba(0,0,0,${dimming})`, backdropFilter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined, WebkitBackdropFilter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined }} />
      {vignette > 0 && (
        <div className={`${embedded ? "absolute" : "fixed"} inset-0 z-[1] pointer-events-none`}
          style={{ background: `radial-gradient(ellipse at center, transparent ${Math.round((1 - vignette) * 60)}%, rgba(0,0,0,${vignette * 0.85}) 100%)` }} />
      )}

      <div className={`${embedded ? "absolute" : "fixed"} inset-0 z-10 pointer-events-none transition-all duration-1000 ${isZenMode ? "bg-black/40" : "bg-transparent"}`} />

      {/* Spaces menu */}
      <div className={`${embedded ? "absolute" : "fixed"} bottom-6 left-6 z-[110]`}>
        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/20 text-white/80 text-sm font-medium hover:bg-white/15 transition-all shadow-lg">
          <Image size={16} /><span>Spaces</span><ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-14 left-0 w-80 max-h-[480px] rounded-2xl bg-black/60 backdrop-blur-[20px] border border-white/15 p-4 overflow-auto shadow-2xl">
              {/* Visual controls */}
              <div className="mb-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5"><Sun size={12} className="text-white/50" /><span className="text-[11px] text-white/50 font-medium">Brightness</span></div>
                    <span className="text-[10px] text-white/30 tabular-nums">{Math.round((1 - dimming) * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={0.7} step={0.01} value={dimming}
                    onChange={(e) => { const v = parseFloat(e.target.value); setDimming(v); localStorage.setItem("flux-bg-dimming", String(v)); }}
                    className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-white/80 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/40 [&::-webkit-slider-thumb]:shadow-md" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/50 font-medium">🔍 Blur</span>
                    <span className="text-[10px] text-white/30 tabular-nums">{Math.round(bgBlur)}px</span>
                  </div>
                  <input type="range" min={0} max={20} step={0.5} value={bgBlur}
                    onChange={(e) => { const v = parseFloat(e.target.value); setBgBlur(v); localStorage.setItem("flux-bg-blur", String(v)); }}
                    className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-white/80 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/40 [&::-webkit-slider-thumb]:shadow-md" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/50 font-medium">🌑 Vignette</span>
                    <span className="text-[10px] text-white/30 tabular-nums">{Math.round(vignette * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={vignette}
                    onChange={(e) => { const v = parseFloat(e.target.value); setVignette(v); localStorage.setItem("flux-bg-vignette", String(v)); }}
                    className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-white/80 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/40 [&::-webkit-slider-thumb]:shadow-md" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setSelectedCategory(null)} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${!selectedCategory ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:text-white/80"}`}>All</button>
                {CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedCategory === cat ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:text-white/80"}`}>{cat}</button>
                ))}
              </div>

              {selectedCategory !== "Custom" && (
                <div className="grid grid-cols-2 gap-2">
                  {filteredBgs.map((item) => (
                    <button key={item.id} onClick={() => { setCurrentBackground(item.id); setMenuOpen(false); }}
                      className={`relative rounded-xl overflow-hidden h-20 border-2 transition-all ${currentBackground === item.id ? "border-white/60 ring-2 ring-white/30" : "border-transparent hover:border-white/30"}`}>
                      {item.type === "gradient" && item.colors ? <GradientThumbnail colors={item.colors} /> : <img src={item.src} alt={item.label} className="w-full h-full object-cover" loading="lazy" />}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 flex items-center justify-between">
                        <span className="text-[10px] text-white/80 font-medium">{item.label}</span>
                        {item.type === "video" && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-[8px] font-semibold text-white/90 uppercase tracking-wider">Live</span></span>}
                      </div>
                    </button>
                  ))}
                  {(selectedCategory === "Aurora" || !selectedCategory) && customGrads.map((grad) => (
                    <div key={grad.id} className="relative group">
                      <button onClick={() => { setCurrentBackground(grad.id); setMenuOpen(false); }}
                        className={`relative rounded-xl overflow-hidden h-20 w-full border-2 transition-all ${currentBackground === grad.id ? "border-white/60 ring-2 ring-white/30" : "border-transparent hover:border-white/30"}`}>
                        <GradientThumbnail colors={grad.colors} />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1"><span className="text-[10px] text-white/80 font-medium">{grad.label}</span></div>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteGrad(grad.id); }} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={10} /></button>
                    </div>
                  ))}
                  {selectedCategory === "Aurora" && !showGradCreator && (
                    <button onClick={() => setShowGradCreator(true)} className="flex flex-col items-center justify-center gap-1.5 rounded-xl h-20 border-2 border-dashed border-white/15 text-white/40 hover:text-white/60 hover:border-white/25 transition-all">
                      <Palette size={16} /><span className="text-[10px] font-medium">Create Custom</span>
                    </button>
                  )}
                </div>
              )}

              {selectedCategory === "Aurora" && showGradCreator && <CustomGradientCreator onSave={handleSaveGrad} onCancel={() => setShowGradCreator(false)} />}

              <CustomUploadSection customBgs={customBgs} onUpload={handleUpload} onAddYoutube={handleAddYoutube} onDelete={handleDeleteCustom}
                onSelect={(id) => { setCurrentBackground(id); setMenuOpen(false); }} currentBg={currentBackground} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default BackgroundEngine;
