import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Frown, Meh, Zap, Heart, Sun, Cloud, CloudRain, Flame, Moon } from "lucide-react";

interface MoodEntry {
  date: string;
  mood: string;
  energy: number;
  note: string;
}

const MOODS = [
  { key: "great", icon: Sun, label: "Great", color: "hsl(45 93% 50%)" },
  { key: "good", icon: Smile, label: "Good", color: "hsl(var(--aurora-blue))" },
  { key: "okay", icon: Meh, label: "Okay", color: "hsl(var(--aurora-violet))" },
  { key: "low", icon: Cloud, label: "Low", color: "hsl(var(--muted-foreground))" },
  { key: "bad", icon: CloudRain, label: "Bad", color: "hsl(0 72% 55%)" },
] as const;

const MoodTracker = () => {
  const [entries, setEntries] = useState<MoodEntry[]>(() => {
    const saved = localStorage.getItem("flux_mood_entries");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const todayEntry = entries.find((e) => e.date === today);

  useEffect(() => {
    localStorage.setItem("flux_mood_entries", JSON.stringify(entries));
  }, [entries]);

  const handleLog = () => {
    if (!selectedMood) return;
    const newEntry: MoodEntry = { date: today, mood: selectedMood, energy, note };
    setEntries((prev) => [newEntry, ...prev.filter((e) => e.date !== today)]);
    setSelectedMood(null);
    setNote("");
    setEnergy(3);
  };

  // Last 7 days for mini chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    return entries.find((e) => e.date === dateStr) || null;
  });

  const moodToHeight = (mood: string) => {
    const map: Record<string, number> = { great: 100, good: 75, okay: 50, low: 30, bad: 15 };
    return map[mood] || 50;
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-bold font-display">Mood Tracker</h3>

      {todayEntry ? (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
          <p className="text-xs text-muted-foreground mb-1">Today's mood</p>
          <div className="flex items-center justify-center gap-2">
            {(() => {
              const m = MOODS.find((m) => m.key === todayEntry.mood);
              if (!m) return null;
              const Icon = m.icon;
              return (
                <>
                  <Icon size={24} style={{ color: m.color }} />
                  <span className="text-lg font-bold" style={{ color: m.color }}>{m.label}</span>
                </>
              );
            })()}
          </div>
          {todayEntry.note && (
            <p className="text-xs text-muted-foreground mt-2 italic">"{todayEntry.note}"</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">How are you feeling today?</p>
          <div className="flex justify-center gap-3">
            {MOODS.map((m) => {
              const Icon = m.icon;
              const isActive = selectedMood === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedMood(m.key)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    isActive ? "bg-primary/10 scale-110 shadow-sm" : "hover:bg-secondary/40"
                  }`}
                >
                  <Icon size={24} style={{ color: isActive ? m.color : undefined }} className={isActive ? "" : "text-muted-foreground"} />
                  <span className="text-[10px] font-medium" style={{ color: isActive ? m.color : undefined }}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedMood && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  Energy: {energy}/5 <Zap size={10} className="inline text-amber-500" />
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Quick note (optional)..."
                className="w-full px-3 py-2 rounded-xl bg-secondary/30 border border-border/30 text-xs outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={handleLog}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
              >
                Log Mood
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* 7-day mini chart */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground mb-2">Last 7 Days</p>
        <div className="flex items-end gap-1.5 h-16">
          {last7.map((entry, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: entry ? `${moodToHeight(entry.mood)}%` : "10%" }}
                transition={{ delay: i * 0.05 }}
                className="w-full rounded-t-md"
                style={{
                  backgroundColor: entry
                    ? MOODS.find((m) => m.key === entry.mood)?.color || "hsl(var(--muted))"
                    : "hsl(var(--muted))",
                  opacity: entry ? 1 : 0.2,
                }}
              />
              <span className="text-[8px] text-muted-foreground">
                {["S", "M", "T", "W", "T", "F", "S"][new Date(new Date().setDate(new Date().getDate() - (6 - i))).getDay()]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoodTracker;
