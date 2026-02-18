import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Sparkles, Check,
  Folder, Briefcase, Rocket, Lightbulb, BookOpen, Dumbbell,
  Camera, Palette, Music, Code, Globe, Heart, Star, Zap,
  Target, Compass, Flame, Coffee, Mic, Film, PenTool, Box,
  Gamepad2, Plane, ShoppingBag, Landmark, GraduationCap,
  Megaphone, Trophy, Headphones, Wrench, Shield, Leaf,
  Pizza, Gem, Crown, Telescope, Atom, Fingerprint,
  Swords, Bike, Mountain, Sailboat, Pen, Calculator,
  Clock, Gift, Map, Glasses, Cpu, Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";

const FOLDER_COLORS = [
  { name: "Blue", value: "hsl(var(--aurora-blue))" },
  { name: "Violet", value: "hsl(var(--aurora-violet))" },
  { name: "Pink", value: "hsl(var(--aurora-pink))" },
  { name: "Green", value: "hsl(150 60% 45%)" },
  { name: "Orange", value: "hsl(30 90% 55%)" },
  { name: "Indigo", value: "hsl(var(--aurora-indigo))" },
  { name: "Teal", value: "hsl(175 60% 42%)" },
  { name: "Red", value: "hsl(0 72% 55%)" },
  { name: "Amber", value: "hsl(45 93% 50%)" },
  { name: "Lime", value: "hsl(85 65% 45%)" },
];

export const FOLDER_ICONS: { name: string; icon: LucideIcon }[] = [
  { name: "Folder", icon: Folder },
  { name: "Briefcase", icon: Briefcase },
  { name: "Rocket", icon: Rocket },
  { name: "Lightbulb", icon: Lightbulb },
  { name: "BookOpen", icon: BookOpen },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Camera", icon: Camera },
  { name: "Palette", icon: Palette },
  { name: "Music", icon: Music },
  { name: "Code", icon: Code },
  { name: "Globe", icon: Globe },
  { name: "Heart", icon: Heart },
  { name: "Star", icon: Star },
  { name: "Zap", icon: Zap },
  { name: "Target", icon: Target },
  { name: "Compass", icon: Compass },
  { name: "Flame", icon: Flame },
  { name: "Coffee", icon: Coffee },
  { name: "Mic", icon: Mic },
  { name: "Film", icon: Film },
  { name: "PenTool", icon: PenTool },
  { name: "Box", icon: Box },
  { name: "Gamepad2", icon: Gamepad2 },
  { name: "Plane", icon: Plane },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Landmark", icon: Landmark },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Megaphone", icon: Megaphone },
  { name: "Trophy", icon: Trophy },
  { name: "Headphones", icon: Headphones },
  { name: "Wrench", icon: Wrench },
  { name: "Shield", icon: Shield },
  { name: "Leaf", icon: Leaf },
  { name: "Pizza", icon: Pizza },
  { name: "Gem", icon: Gem },
  { name: "Crown", icon: Crown },
  { name: "Telescope", icon: Telescope },
  { name: "Atom", icon: Atom },
  { name: "Fingerprint", icon: Fingerprint },
  { name: "Swords", icon: Swords },
  { name: "Bike", icon: Bike },
  { name: "Mountain", icon: Mountain },
  { name: "Sailboat", icon: Sailboat },
  { name: "Pen", icon: Pen },
  { name: "Calculator", icon: Calculator },
  { name: "Clock", icon: Clock },
  { name: "Gift", icon: Gift },
  { name: "Map", icon: Map },
  { name: "Glasses", icon: Glasses },
  { name: "Cpu", icon: Cpu },
  { name: "Wifi", icon: Wifi },
];

interface SuggestedSub {
  title: string;
}

function suggestStructure(name: string): SuggestedSub[] {
  const lower = name.toLowerCase();
  if (/ugc|creator|content|youtube|tiktok|instagram|influencer/i.test(lower)) {
    return [{ title: "Ideer" }, { title: "Research" }, { title: "Content Drafts" }, { title: "Outreach" }, { title: "Content Pipeline" }];
  }
  if (/startup|business|virksomhed|saas|app|produkt/i.test(lower)) {
    return [{ title: "Research" }, { title: "Strategi" }, { title: "MVP" }, { title: "Marketing" }, { title: "Økonomi" }];
  }
  if (/træning|fitness|workout|sundhed|gym/i.test(lower)) {
    return [{ title: "Programmer" }, { title: "Ernæring" }, { title: "Mål" }, { title: "Tracking" }];
  }
  if (/studie|lær|kursus|uddannelse|skole|universitet/i.test(lower)) {
    return [{ title: "Noter" }, { title: "Opgaver" }, { title: "Ressourcer" }, { title: "Eksamen" }];
  }
  return [];
}

export function suggestIcon(name: string): string {
  const lower = name.toLowerCase();
  if (/ugc|creator|content|youtube|tiktok|instagram|influencer/i.test(lower)) return "Camera";
  if (/startup|business|virksomhed|saas|produkt/i.test(lower)) return "Rocket";
  if (/træning|fitness|workout|sundhed|gym/i.test(lower)) return "Dumbbell";
  if (/studie|lær|kursus|uddannelse|skole|universitet/i.test(lower)) return "BookOpen";
  if (/musik|music|band|sang/i.test(lower)) return "Music";
  if (/code|kode|dev|programmering/i.test(lower)) return "Code";
  if (/design|kunst|art/i.test(lower)) return "Palette";
  if (/rejse|travel|trip|ferie/i.test(lower)) return "Plane";
  if (/mad|food|opskrift|recipe|ernæring/i.test(lower)) return "Coffee";
  if (/gaming|spil|game/i.test(lower)) return "Gamepad2";
  if (/penge|økonomi|finans|finance|budget|invest/i.test(lower)) return "Landmark";
  if (/marketing|reklame|ads|annonce|megaphone/i.test(lower)) return "Megaphone";
  if (/research|undersøg|analyse/i.test(lower)) return "Telescope";
  if (/ideer|ideas|brainstorm/i.test(lower)) return "Lightbulb";
  if (/mål|goals|target/i.test(lower)) return "Target";
  if (/strategi|strategy|plan/i.test(lower)) return "Compass";
  if (/outreach|netværk|network/i.test(lower)) return "Globe";
  if (/pipeline|workflow|proces/i.test(lower)) return "Zap";
  if (/draft|udkast|script/i.test(lower)) return "PenTool";
  if (/film|video|redigering|edit/i.test(lower)) return "Film";
  if (/podcast|lyd|audio/i.test(lower)) return "Mic";
  if (/shopping|køb|butik|shop/i.test(lower)) return "ShoppingBag";
  return "Folder";
}

interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; color: string | null; icon: string; subfolders: string[] }) => void;
}

const CreateFolderModal = ({ open, onClose, onCreate }: CreateFolderModalProps) => {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>("Folder");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [useStructure, setUseStructure] = useState(true);

  const suggestions = useMemo(() => suggestStructure(name), [name]);
  const hasSuggestions = suggestions.length > 0;
  const autoIcon = useMemo(() => suggestIcon(name), [name]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({
      title: name.trim(),
      color: selectedColor,
      icon: activeIconName,
      subfolders: useStructure && hasSuggestions ? suggestions.map((s) => s.title) : [],
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setName("");
    setSelectedColor(null);
    setSelectedIcon("Folder");
    setShowIconPicker(false);
    setUseStructure(true);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const activeIconName = selectedIcon !== "Folder" ? selectedIcon : autoIcon;
  const ActiveIcon = FOLDER_ICONS.find((i) => i.name === activeIconName)?.icon || Folder;
  const iconColor = selectedColor || "hsl(var(--primary))";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/10 backdrop-blur-md"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="absolute inset-0 overflow-hidden rounded-3xl">
                <div className="absolute -top-1/3 -left-1/4 w-2/3 h-2/3 rounded-full opacity-20 animate-aurora-slow-1" style={{ background: `radial-gradient(circle, ${selectedColor || "hsl(var(--aurora-blue))"}, transparent 70%)` }} />
                <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 rounded-full opacity-15 animate-aurora-slow-2" style={{ background: "radial-gradient(circle, hsl(var(--aurora-violet)), transparent 70%)" }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 rounded-full opacity-10 animate-aurora-slow-3" style={{ background: "radial-gradient(circle, hsl(var(--aurora-pink)), transparent 70%)" }} />
              </div>

              <div className="relative bg-card/75 backdrop-blur-2xl border border-border/50 rounded-3xl shadow-2xl p-6 md:p-8">
                <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-secondary/50 hover:bg-secondary transition-colors z-10">
                  <X size={14} className="text-muted-foreground" />
                </button>

                <div className="mb-5">
                  <h2 className="text-xl font-bold font-display flex items-center gap-2.5">
                    <button
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      className="relative p-2 rounded-xl transition-all duration-300 hover:scale-110 group"
                      style={{ background: `linear-gradient(135deg, ${iconColor}15, ${iconColor}25)`, boxShadow: `0 0 20px ${iconColor}15` }}
                      title={t("folder.change_icon")}
                    >
                      <ActiveIcon size={18} style={{ color: iconColor }} className="transition-colors duration-300" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-secondary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PenTool size={6} className="text-muted-foreground" />
                      </div>
                    </button>
                    {t("folder.create_title")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 ml-11">{t("folder.create_desc")}</p>
                </div>

                <AnimatePresence>
                  {showIconPicker && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="mb-4 overflow-hidden">
                      <div className="p-3 rounded-2xl bg-background/60 border border-border/60">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t("folder.choose_icon")}</p>
                        <div className="grid grid-cols-11 gap-1">
                          {FOLDER_ICONS.map((item) => {
                            const IconComp = item.icon;
                            const isActive = activeIconName === item.name;
                            return (
                              <button key={item.name} onClick={() => { setSelectedIcon(item.name); setShowIconPicker(false); }}
                                className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${isActive ? "bg-primary/15 shadow-sm scale-110" : "hover:bg-secondary/60"}`} title={item.name}>
                                <IconComp size={16} style={{ color: isActive ? iconColor : undefined }} className={isActive ? "" : "text-muted-foreground"} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder={t("folder.name_placeholder")}
                  className="w-full p-4 rounded-2xl bg-background/60 border border-border/60 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 placeholder:text-muted-foreground/50 mb-4 transition-all duration-200"
                  autoFocus
                />

                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{t("folder.color_label")}</p>
                  <div className="flex flex-wrap gap-2">
                    {FOLDER_COLORS.map((c) => (
                      <button key={c.name} onClick={() => setSelectedColor(selectedColor === c.value ? null : c.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 ${selectedColor === c.value ? "border-foreground/40 scale-110 shadow-md" : "border-transparent"}`}
                        style={{ backgroundColor: c.value }} title={c.name} />
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {hasSuggestions && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="mb-4 overflow-hidden">
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles size={12} className="text-primary" />
                            <span className="text-xs font-semibold text-foreground">{t("folder.ai_structure")}</span>
                          </div>
                          <button onClick={() => setUseStructure(!useStructure)}
                            className={`w-8 h-5 rounded-full transition-colors duration-200 relative ${useStructure ? "bg-primary" : "bg-secondary"}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${useStructure ? "translate-x-3.5" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {suggestions.map((s, i) => (
                            <motion.div key={s.title} initial={{ opacity: 0, x: -8 }} animate={{ opacity: useStructure ? 1 : 0.4, x: 0 }} transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedColor || "hsl(var(--primary))" }} />
                              {s.title}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={handleSubmit} disabled={!name.trim()}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Check size={14} />
                  {t("folder.create_button")}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateFolderModal;
