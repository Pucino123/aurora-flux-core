import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { pushNotification } from "@/components/NotificationBell";

// ── Types ──
export interface DbFolder {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  type: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  folder_id: string | null;
  user_id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  done: boolean;
  pinned: boolean;
  due_date: string | null;
  energy_level: number | null;
  priority: string;
  scheduled_date: string | null;
  tags: string[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbGoal {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbWorkout {
  id: string;
  user_id: string;
  date: string;
  activity: string;
  energy: number;
  mood: string;
  created_at: string;
}

export interface DbScheduleBlock {
  id: string;
  user_id: string;
  title: string;
  time: string;
  duration: string;
  type: string;
  scheduled_date: string;
  task_id: string | null;
  created_at: string;
}

// Tree node for UI (built from flat DB rows)
export interface FolderNode {
  id: string;
  title: string;
  type: string;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  children: FolderNode[];
  tasks: DbTask[];
}

// ── Build tree from flat folders + tasks ──
function buildTree(folders: DbFolder[], tasks: DbTask[]): FolderNode[] {
  const nodeMap = new Map<string, FolderNode>();
  for (const f of folders) {
    nodeMap.set(f.id, {
      id: f.id, title: f.title, type: f.type, color: f.color, icon: f.icon,
      parent_id: f.parent_id, sort_order: f.sort_order,
      children: [], tasks: tasks.filter((t) => t.folder_id === f.id),
    });
  }
  const roots: FolderNode[] = [];
  for (const f of folders) {
    const node = nodeMap.get(f.id)!;
    if (f.parent_id && nodeMap.has(f.parent_id)) {
      nodeMap.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Sort children
  const sortNodes = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

function flattenTree(nodes: FolderNode[]): FolderNode[] {
  const result: FolderNode[] = [];
  for (const n of nodes) {
    result.push(n);
    result.push(...flattenTree(n.children));
  }
  return result;
}

// ── Context ──
interface FluxContextValue {
  // Data
  folders: DbFolder[];
  folderTree: FolderNode[];
  tasks: DbTask[];
  goals: DbGoal[];
  workouts: DbWorkout[];
  scheduleBlocks: DbScheduleBlock[];
  inboxTasks: DbTask[];
  loading: boolean;

  // Navigation
  activeFolder: string | null;
  setActiveFolder: (id: string | null) => void;
  activeView: "stream" | "canvas" | "council" | "focus" | "calendar" | "analytics" | "projects" | "documents" | "settings" | "tasks";
  setActiveView: (v: "stream" | "canvas" | "council" | "focus" | "calendar" | "analytics" | "projects" | "documents" | "settings" | "tasks") => void;
  pendingDocumentId: string | null;
  setPendingDocumentId: (id: string | null) => void;
  filterPersona: string | null;
  setFilterPersona: (p: string | null) => void;

  // Folder CRUD
  createFolder: (data: { parent_id?: string | null; title: string; type: string; color?: string; icon?: string }) => Promise<DbFolder | null>;
  updateFolder: (id: string, data: Partial<Pick<DbFolder, "title" | "color" | "icon" | "parent_id" | "sort_order" | "type">>) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  moveFolder: (folderId: string, newParentId: string | null) => Promise<void>;

  // Task CRUD
  createTask: (data: Partial<DbTask> & { title: string }) => Promise<DbTask | null>;
  updateTask: (id: string, data: Partial<DbTask>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;

  // Goal CRUD
  createGoal: (data: Partial<DbGoal> & { title: string }) => Promise<DbGoal | null>;
  updateGoal: (id: string, data: Partial<DbGoal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;

  // Workout CRUD
  logWorkout: (data: { date: string; activity: string; energy: number; mood: string }) => Promise<void>;
  editWorkout: (id: string, data: Partial<DbWorkout>) => Promise<void>;
  removeWorkout: (id: string) => Promise<void>;

  // Schedule CRUD
  createBlock: (data: Partial<DbScheduleBlock> & { title: string; time: string }) => Promise<DbScheduleBlock | null>;
  updateBlock: (id: string, data: Partial<DbScheduleBlock>) => Promise<void>;
  removeBlock: (id: string) => Promise<void>;
  replaceBlocksForDate: (date: string, blocks: Omit<DbScheduleBlock, "id" | "user_id" | "created_at">[]) => Promise<void>;
  scheduleTask: (taskId: string, startTime: string, date?: string) => Promise<void>;

  // Helpers
  findFolderNode: (id: string) => FolderNode | undefined;
  getAllFoldersFlat: () => FolderNode[];
  getDescendantFolderIds: (id: string) => string[];
  refreshAll: () => Promise<void>;
}

const FluxContext = createContext<FluxContextValue | null>(null);

// ── localStorage helpers for offline/anonymous mode ──
const LS_PREFIX = "flux_local_";
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function lsSet<T>(key: string, value: T) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch {}
}

export function FluxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [folders, setFoldersRaw] = useState<DbFolder[]>([]);
  const [tasks, setTasksRaw] = useState<DbTask[]>([]);
  const [goals, setGoalsRaw] = useState<DbGoal[]>([]);
  const [workouts, setWorkoutsRaw] = useState<DbWorkout[]>([]);
  const [scheduleBlocks, setScheduleBlocksRaw] = useState<DbScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"stream" | "canvas" | "council" | "focus" | "calendar" | "analytics" | "projects" | "documents" | "settings" | "tasks">("stream");
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const [filterPersona, setFilterPersona] = useState<string | null>(null);

  // Wrap setters to persist to localStorage when no user
  const setFolders: React.Dispatch<React.SetStateAction<DbFolder[]>> = useCallback((val) => {
    setFoldersRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (!user) lsSet("folders", next);
      return next;
    });
  }, [user]);
  const setTasks: React.Dispatch<React.SetStateAction<DbTask[]>> = useCallback((val) => {
    setTasksRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (!user) lsSet("tasks", next);
      return next;
    });
  }, [user]);
  const setGoals: React.Dispatch<React.SetStateAction<DbGoal[]>> = useCallback((val) => {
    setGoalsRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (!user) lsSet("goals", next);
      return next;
    });
  }, [user]);
  const setWorkouts: React.Dispatch<React.SetStateAction<DbWorkout[]>> = useCallback((val) => {
    setWorkoutsRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (!user) lsSet("workouts", next);
      return next;
    });
  }, [user]);
  const setScheduleBlocks: React.Dispatch<React.SetStateAction<DbScheduleBlock[]>> = useCallback((val) => {
    setScheduleBlocksRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      if (!user) lsSet("schedule_blocks", next);
      return next;
    });
  }, [user]);

  // ── Fetch all data ──
  const refreshAll = useCallback(async () => {
    if (!user) {
      // Load from localStorage for anonymous mode
      setFoldersRaw(lsGet<DbFolder[]>("folders", []));
      setTasksRaw(lsGet<DbTask[]>("tasks", []));
      setGoalsRaw(lsGet<DbGoal[]>("goals", []));
      setWorkoutsRaw(lsGet<DbWorkout[]>("workouts", []));
      setScheduleBlocksRaw(lsGet<DbScheduleBlock[]>("schedule_blocks", []));
      setLoading(false);
      return;
    }
    setLoading(true);
    const [fRes, tRes, gRes, wRes, sRes] = await Promise.all([
      supabase.from("folders").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("schedule_blocks").select("*").eq("user_id", user.id).order("time"),
    ]);
    setFoldersRaw((fRes.data || []) as unknown as DbFolder[]);
    setTasksRaw((tRes.data || []) as unknown as DbTask[]);
    setGoalsRaw((gRes.data || []) as unknown as DbGoal[]);
    setWorkoutsRaw((wRes.data || []) as unknown as DbWorkout[]);
    setScheduleBlocksRaw((sRes.data || []) as unknown as DbScheduleBlock[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ── Realtime subscriptions (incremental, not full refresh) ──
  useEffect(() => {
    if (!user) return;

    const handleChange = <T extends { id: string }>(
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      eventType: string,
      newRecord: any,
      oldRecord: any
    ) => {
      if (eventType === "INSERT") {
        setter((prev) => {
          if (prev.some((item) => item.id === newRecord.id)) return prev;
          return [...prev, newRecord as T];
        });
      } else if (eventType === "UPDATE") {
        setter((prev) => prev.map((item) => item.id === newRecord.id ? { ...item, ...newRecord } as T : item));
      } else if (eventType === "DELETE") {
        const deletedId = oldRecord?.id;
        if (deletedId) {
          setter((prev) => prev.filter((item) => item.id !== deletedId));
        }
      }
    };

    const channel = supabase.channel("flux-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "folders" }, (payload) =>
        handleChange(setFolders, payload.eventType, payload.new, payload.old)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) =>
        handleChange(setTasks, payload.eventType, payload.new, payload.old)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, (payload) =>
        handleChange(setGoals, payload.eventType, payload.new, payload.old)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_blocks" }, (payload) =>
        handleChange(setScheduleBlocks, payload.eventType, payload.new, payload.old)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Derived state ──
  const folderTree = useMemo(() => buildTree(folders, tasks), [folders, tasks]);
  const inboxTasks = useMemo(() => tasks.filter((t) => !t.folder_id), [tasks]);

  const findFolderNode = useCallback((id: string): FolderNode | undefined => {
    const search = (nodes: FolderNode[]): FolderNode | undefined => {
      for (const n of nodes) {
        if (n.id === id) return n;
        const found = search(n.children);
        if (found) return found;
      }
      return undefined;
    };
    return search(folderTree);
  }, [folderTree]);

  const getAllFoldersFlat = useCallback(() => flattenTree(folderTree), [folderTree]);

  // ── Folder CRUD ──
  const createFolder = useCallback(async (data: { parent_id?: string | null; title: string; type: string; color?: string; icon?: string }) => {
    const localId = crypto.randomUUID();
    const localUserId = user?.id || "local";
    const optimistic: DbFolder = {
      id: localId, user_id: localUserId, parent_id: data.parent_id || null,
      title: data.title, type: data.type, color: data.color || null, icon: data.icon || null,
      sort_order: folders.length, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (!user) {
      setFolders((prev) => [...prev, optimistic]);
      return optimistic;
    }
    setFolders((prev) => [...prev, optimistic]);
    const { data: row, error } = await supabase.from("folders").insert({
      user_id: user.id, parent_id: data.parent_id || null,
      title: data.title, type: data.type, color: data.color || null, icon: data.icon || null,
    } as any).select().single();
    if (error) { console.error(error); setFolders((prev) => prev.filter((f) => f.id !== localId)); return null; }
    setFolders((prev) => prev.map((f) => f.id === localId ? (row as unknown as DbFolder) : f));
    return row as unknown as DbFolder;
  }, [user, folders.length]);

  const updateFolder = useCallback(async (id: string, data: Partial<Pick<DbFolder, "title" | "color" | "icon" | "parent_id" | "sort_order" | "type">>) => {
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, ...data } : f));
    if (!user) return;
    const { error } = await supabase.from("folders").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeFolder = useCallback(async (id: string) => {
    setFolders((f) => f.filter((x) => x.id !== id));
    if (!user) return;
    const { error } = await supabase.from("folders").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, folders, refreshAll]);

  const moveFolder = useCallback(async (folderId: string, newParentId: string | null) => {
    if (newParentId) {
      let current = newParentId;
      const visited = new Set<string>();
      while (current) {
        if (current === folderId) return;
        if (visited.has(current)) break;
        visited.add(current);
        const parent = folders.find((f) => f.id === current);
        current = parent?.parent_id || "";
      }
    }
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, parent_id: newParentId } : f))
    );
    if (!user) return;
    const { error } = await supabase.from("folders").update({ parent_id: newParentId } as any).eq("id", folderId).eq("user_id", user.id);
    if (error) {
      console.error("moveFolder error:", error);
      refreshAll();
    }
  }, [user, folders, refreshAll]);

  // ── Task CRUD ──
  const createTask = useCallback(async (data: Partial<DbTask> & { title: string }) => {
    const localId = crypto.randomUUID();
    const localUserId = user?.id || "local";
    const optimistic: DbTask = {
      id: localId, user_id: localUserId, folder_id: data.folder_id || null,
      title: data.title, content: data.content || "", type: data.type || "task",
      status: "todo", done: false, pinned: false, due_date: null,
      energy_level: null, priority: data.priority || "medium",
      scheduled_date: data.scheduled_date || null, tags: null, sort_order: tasks.length,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (!user) {
      setTasks((prev) => [...prev, optimistic]);
      return optimistic;
    }
    setTasks((prev) => [...prev, optimistic]);
    const { data: row, error } = await supabase.from("tasks").insert({
      user_id: user.id, ...data,
    } as any).select().single();
    if (error) { console.error(error); setTasks((prev) => prev.filter((t) => t.id !== localId)); return null; }
    setTasks((prev) => prev.map((t) => t.id === localId ? (row as unknown as DbTask) : t));
    // Push notification
    pushNotification({
      type: "general",
      title: "Task Created",
      body: `"${data.title}" added to your tasks`,
      icon: "✅",
    });
    return row as unknown as DbTask;
  }, [user, tasks.length]);

  const updateTask = useCallback(async (id: string, data: Partial<DbTask>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
    if (!user) return;
    const { error } = await supabase.from("tasks").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeTask = useCallback(async (id: string) => {
    setTasks((t) => t.filter((x) => x.id !== id));
    setScheduleBlocks((blocks) => blocks.filter((b) => b.task_id !== id));
    if (!user) return;
    const linkedBlocks = scheduleBlocks.filter((b) => b.task_id === id);
    linkedBlocks.forEach((b) => supabase.from("schedule_blocks").delete().eq("id", b.id).eq("user_id", user.id));
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, tasks, scheduleBlocks, refreshAll]);

  // ── Goal CRUD ──
  const createGoal = useCallback(async (data: Partial<DbGoal> & { title: string }) => {
    const localId = crypto.randomUUID();
    const localUserId = user?.id || "local";
    const optimistic: DbGoal = {
      id: localId, user_id: localUserId, folder_id: data.folder_id || null,
      title: data.title, target_amount: data.target_amount || 0,
      current_amount: data.current_amount || 0, deadline: data.deadline || null,
      pinned: data.pinned ?? false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (!user) {
      setGoals((prev) => [optimistic, ...prev]);
      return optimistic;
    }
    setGoals((prev) => [optimistic, ...prev]);
    const { data: row, error } = await supabase.from("goals").insert({
      user_id: user.id, ...data,
    } as any).select().single();
    if (error) { console.error(error); setGoals((prev) => prev.filter((g) => g.id !== localId)); return null; }
    setGoals((prev) => prev.map((g) => g.id === localId ? (row as unknown as DbGoal) : g));
    return row as unknown as DbGoal;
  }, [user]);

  const updateGoal = useCallback(async (id: string, data: Partial<DbGoal>) => {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g));
    if (!user) return;
    const { error } = await supabase.from("goals").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeGoal = useCallback(async (id: string) => {
    setGoals((g) => g.filter((x) => x.id !== id));
    if (!user) return;
    const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, goals, refreshAll]);

  // ── Workout CRUD ──
  const logWorkout = useCallback(async (data: { date: string; activity: string; energy: number; mood: string }) => {
    const localId = crypto.randomUUID();
    const localUserId = user?.id || "local";
    const optimistic: DbWorkout = { id: localId, user_id: localUserId, ...data, created_at: new Date().toISOString() };
    setWorkouts((prev) => [optimistic, ...prev]);
    if (!user) return;
    const { error } = await supabase.from("workouts").insert({ ...data, user_id: user.id } as any);
    if (error) { console.error(error); setWorkouts((prev) => prev.filter((w) => w.id !== localId)); }
  }, [user]);

  const editWorkout = useCallback(async (id: string, data: Partial<DbWorkout>) => {
    setWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, ...data } : w));
    if (!user) return;
    const { error } = await supabase.from("workouts").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeWorkout = useCallback(async (id: string) => {
    setWorkouts((w) => w.filter((x) => x.id !== id));
    if (!user) return;
    const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, workouts, refreshAll]);

  // ── Schedule CRUD ──
  const createBlock = useCallback(async (data: Partial<DbScheduleBlock> & { title: string; time: string }) => {
    const localId = crypto.randomUUID();
    const localUserId = user?.id || "local";
    const optimistic: DbScheduleBlock = {
      id: localId, user_id: localUserId, title: data.title, time: data.time,
      duration: data.duration || "30m", type: data.type || "custom",
      scheduled_date: data.scheduled_date || new Date().toISOString().split("T")[0],
      task_id: data.task_id || null, created_at: new Date().toISOString(),
    };
    if (!user) {
      setScheduleBlocks((prev) => [...prev, optimistic]);
      return optimistic;
    }
    setScheduleBlocks((prev) => [...prev, optimistic]);
    const { data: row, error } = await supabase.from("schedule_blocks").insert({
      user_id: user.id, ...data,
    } as any).select().single();
    if (error) { console.error(error); setScheduleBlocks((prev) => prev.filter((b) => b.id !== localId)); return null; }
    setScheduleBlocks((prev) => prev.map((b) => b.id === localId ? (row as unknown as DbScheduleBlock) : b));
    return row as unknown as DbScheduleBlock;
  }, [user]);

  const updateBlock = useCallback(async (id: string, data: Partial<DbScheduleBlock>) => {
    setScheduleBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...data } : b));
    if (!user) return;
    const { error } = await supabase.from("schedule_blocks").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeBlock = useCallback(async (id: string) => {
    setScheduleBlocks((b) => b.filter((x) => x.id !== id));
    if (!user) return;
    const { error } = await supabase.from("schedule_blocks").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, scheduleBlocks, refreshAll]);

  const replaceBlocksForDate = useCallback(async (date: string, blocks: Omit<DbScheduleBlock, "id" | "user_id" | "created_at">[]) => {
    const localUserId = user?.id || "local";
    if (!user) {
      setScheduleBlocks((prev) => {
        const filtered = prev.filter((b) => b.scheduled_date !== date);
        const newBlocks = blocks.map((b) => ({
          ...b, id: crypto.randomUUID(), user_id: localUserId, created_at: new Date().toISOString(),
        })) as DbScheduleBlock[];
        return [...filtered, ...newBlocks];
      });
      return;
    }
    await supabase.from("schedule_blocks").delete().eq("user_id", user.id).eq("scheduled_date", date);
    if (blocks.length > 0) {
      await supabase.from("schedule_blocks").insert(
        blocks.map((b) => ({ ...b, user_id: user.id })) as any
      );
    }
  }, [user]);

  const getDescendantFolderIds = useCallback((id: string): string[] => {
    const node = findFolderNode(id);
    if (!node) return [];
    const result: string[] = [];
    const collect = (n: FolderNode) => {
      for (const child of n.children) {
        result.push(child.id);
        collect(child);
      }
    };
    collect(node);
    return result;
  }, [findFolderNode]);

  return (
    <FluxContext.Provider
      value={{
        folders, folderTree, tasks, goals, workouts, scheduleBlocks, inboxTasks, loading,
        activeFolder, setActiveFolder, activeView, setActiveView,
        pendingDocumentId, setPendingDocumentId,
        filterPersona, setFilterPersona,
        createFolder, updateFolder, removeFolder, moveFolder,
        createTask, updateTask, removeTask,
        createGoal, updateGoal, removeGoal,
        logWorkout, editWorkout, removeWorkout,
        createBlock, updateBlock, removeBlock, replaceBlocksForDate,
        findFolderNode, getAllFoldersFlat, getDescendantFolderIds, refreshAll,
      }}
    >
      {children}
    </FluxContext.Provider>
  );
}

export function useFlux() {
  const ctx = useContext(FluxContext);
  if (!ctx) throw new Error("useFlux must be used within FluxProvider");
  return ctx;
}
