const STORAGE_KEY = "flux-widget-usage";

interface UsageEntry {
  count: number;
  lastUsed: number;
  hourlyBreakdown: Record<number, number>;
}

type UsageData = Record<string, UsageEntry>;

function loadUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsage(data: UsageData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function trackWidgetToggle(widgetId: string) {
  const data = loadUsage();
  const hour = new Date().getHours();
  const entry = data[widgetId] || { count: 0, lastUsed: 0, hourlyBreakdown: {} };
  entry.count += 1;
  entry.lastUsed = Date.now();
  entry.hourlyBreakdown[hour] = (entry.hourlyBreakdown[hour] || 0) + 1;
  data[widgetId] = entry;
  saveUsage(data);
}

export function getSuggestedWidgets(activeWidgets: string[], limit = 3): string[] {
  const data = loadUsage();
  const hour = new Date().getHours();

  const candidates = Object.entries(data)
    .filter(([id]) => !activeWidgets.includes(id))
    .map(([id, entry]) => {
      const hourScore = entry.hourlyBreakdown[hour] || 0;
      const totalScore = entry.count;
      // Weighted: time-relevant usage matters more
      const score = hourScore * 3 + totalScore;
      return { id, score };
    })
    .filter((c) => c.score > 2) // Only suggest after meaningful usage
    .sort((a, b) => b.score - a.score);

  return candidates.slice(0, limit).map((c) => c.id);
}
