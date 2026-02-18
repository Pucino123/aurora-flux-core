import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  activeView: "stream" | "canvas" | "council" | "focus" | "calendar" | "analytics" | "projects" | "documents" | "settings";
  setActiveView: (v: "stream" | "canvas" | "council" | "focus" | "calendar" | "analytics" | "projects" | "documents" | "settings") => void;
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

  // Helpers
  findFolderNode: (id: string) => FolderNode | undefined;
  getAllFoldersFlat: () => FolderNode[];
  getDescendantFolderIds: (id: string) => string[];
  refreshAll: () => Promise<void>;
}

const FluxContext = createContext<FluxContextValue | null>(null);

export function FluxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<DbFolder[]>([]);
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [goals, setGoals] = useState<DbGoal[]>([]);
  const [workouts, setWorkouts] = useState<DbWorkout[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<DbScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"stream" | "canvas" | "council" | "focus" | "calendar" | "analytics" | "projects" | "documents" | "settings">("stream");
  const [filterPersona, setFilterPersona] = useState<string | null>(null);

  // ── Fetch all data ──
  const refreshAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const [fRes, tRes, gRes, wRes, sRes] = await Promise.all([
      supabase.from("folders").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("tasks").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("schedule_blocks").select("*").eq("user_id", user.id).order("time"),
    ]);
    setFolders((fRes.data || []) as unknown as DbFolder[]);
    setTasks((tRes.data || []) as unknown as DbTask[]);
    setGoals((gRes.data || []) as unknown as DbGoal[]);
    setWorkouts((wRes.data || []) as unknown as DbWorkout[]);
    setScheduleBlocks((sRes.data || []) as unknown as DbScheduleBlock[]);
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
    if (!user) return null;
    const tempId = crypto.randomUUID();
    const optimistic: DbFolder = {
      id: tempId, user_id: user.id, parent_id: data.parent_id || null,
      title: data.title, type: data.type, color: data.color || null, icon: data.icon || null,
      sort_order: folders.length, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setFolders((prev) => [...prev, optimistic]);
    const { data: row, error } = await supabase.from("folders").insert({
      user_id: user.id, parent_id: data.parent_id || null,
      title: data.title, type: data.type, color: data.color || null, icon: data.icon || null,
    } as any).select().single();
    if (error) { console.error(error); setFolders((prev) => prev.filter((f) => f.id !== tempId)); return null; }
    setFolders((prev) => prev.map((f) => f.id === tempId ? (row as unknown as DbFolder) : f));
    return row as unknown as DbFolder;
  }, [user, folders.length]);

  const updateFolder = useCallback(async (id: string, data: Partial<Pick<DbFolder, "title" | "color" | "icon" | "parent_id" | "sort_order" | "type">>) => {
    if (!user) return;
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, ...data } : f));
    const { error } = await supabase.from("folders").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeFolder = useCallback(async (id: string) => {
    if (!user) return;
    const prev = folders;
    setFolders((f) => f.filter((x) => x.id !== id));
    const { error } = await supabase.from("folders").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); setFolders(prev); }
  }, [user, folders]);

  const moveFolder = useCallback(async (folderId: string, newParentId: string | null) => {
    if (!user) return;
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
    const { error } = await supabase.from("folders").update({ parent_id: newParentId } as any).eq("id", folderId).eq("user_id", user.id);
    if (error) {
      console.error("moveFolder error:", error);
      refreshAll();
    }
  }, [user, folders, refreshAll]);

  // ── Task CRUD ──
  const createTask = useCallback(async (data: Partial<DbTask> & { title: string }) => {
    if (!user) return null;
    const tempId = crypto.randomUUID();
    const optimistic: DbTask = {
      id: tempId, user_id: user.id, folder_id: data.folder_id || null,
      title: data.title, content: data.content || "", type: data.type || "task",
      status: "todo", done: false, pinned: false, due_date: null,
      energy_level: null, priority: data.priority || "medium",
      scheduled_date: null, tags: null, sort_order: tasks.length,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, optimistic]);
    const { data: row, error } = await supabase.from("tasks").insert({
      user_id: user.id, ...data,
    } as any).select().single();
    if (error) { console.error(error); setTasks((prev) => prev.filter((t) => t.id !== tempId)); return null; }
    setTasks((prev) => prev.map((t) => t.id === tempId ? (row as unknown as DbTask) : t));
    return row as unknown as DbTask;
  }, [user, tasks.length]);

  const updateTask = useCallback(async (id: string, data: Partial<DbTask>) => {
    if (!user) return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
    const { error } = await supabase.from("tasks").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeTask = useCallback(async (id: string) => {
    if (!user) return;
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== id));
    setScheduleBlocks((blocks) => {
      const linked = blocks.filter((b) => b.task_id === id);
      if (linked.length > 0) {
        linked.forEach((b) => supabase.from("schedule_blocks").delete().eq("id", b.id).eq("user_id", user.id));
      }
      return blocks.filter((b) => b.task_id !== id);
    });
    const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); setTasks(prev); }
  }, [user, tasks]);

  // ── Goal CRUD ──
  const createGoal = useCallback(async (data: Partial<DbGoal> & { title: string }) => {
    if (!user) return null;
    const tempId = crypto.randomUUID();
    const optimistic: DbGoal = {
      id: tempId, user_id: user.id, folder_id: data.folder_id || null,
      title: data.title, target_amount: data.target_amount || 0,
      current_amount: data.current_amount || 0, deadline: data.deadline || null,
      pinned: data.pinned ?? false,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    setGoals((prev) => [optimistic, ...prev]);
    const { data: row, error } = await supabase.from("goals").insert({
      user_id: user.id, ...data,
    } as any).select().single();
    if (error) { console.error(error); setGoals((prev) => prev.filter((g) => g.id !== tempId)); return null; }
    setGoals((prev) => prev.map((g) => g.id === tempId ? (row as unknown as DbGoal) : g));
    return row as unknown as DbGoal;
  }, [user]);

  const updateGoal = useCallback(async (id: string, data: Partial<DbGoal>) => {
    if (!user) return;
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g));
    const { error } = await supabase.from("goals").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeGoal = useCallback(async (id: string) => {
    if (!user) return;
    const prev = goals;
    setGoals((g) => g.filter((x) => x.id !== id));
    const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); setGoals(prev); }
  }, [user, goals]);

  // ── Workout CRUD ──
  const logWorkout = useCallback(async (data: { date: string; activity: string; energy: number; mood: string }) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const optimistic: DbWorkout = { id: tempId, user_id: user.id, ...data, created_at: new Date().toISOString() };
    setWorkouts((prev) => [optimistic, ...prev]);
    const { error } = await supabase.from("workouts").insert({ ...data, user_id: user.id } as any);
    if (error) { console.error(error); setWorkouts((prev) => prev.filter((w) => w.id !== tempId)); }
  }, [user]);

  const editWorkout = useCallback(async (id: string, data: Partial<DbWorkout>) => {
    if (!user) return;
    setWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, ...data } : w));
    const { error } = await supabase.from("workouts").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeWorkout = useCallback(async (id: string) => {
    if (!user) return;
    const prev = workouts;
    setWorkouts((w) => w.filter((x) => x.id !== id));
    const { error } = await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); setWorkouts(prev); }
  }, [user, workouts]);

  // ── Schedule CRUD ──
  const createBlock = useCallback(async (data: Partial<DbScheduleBlock> & { title: string; time: string }) => {
    if (!user) return null;
    const tempId = crypto.randomUUID();
    const optimistic: DbScheduleBlock = {
      id: tempId, user_id: user.id, title: data.title, time: data.time,
      duration: data.duration || "30m", type: data.type || "custom",
      scheduled_date: data.scheduled_date || new Date().toISOString().split("T")[0],
      task_id: data.task_id || null, created_at: new Date().toISOString(),
    };
    setScheduleBlocks((prev) => [...prev, optimistic]);
    const { data: row, error } = await supabase.from("schedule_blocks").insert({
      user_id: user.id, ...data,
    } as any).select().single();
    if (error) { console.error(error); setScheduleBlocks((prev) => prev.filter((b) => b.id !== tempId)); return null; }
    setScheduleBlocks((prev) => prev.map((b) => b.id === tempId ? (row as unknown as DbScheduleBlock) : b));
    return row as unknown as DbScheduleBlock;
  }, [user]);

  const updateBlock = useCallback(async (id: string, data: Partial<DbScheduleBlock>) => {
    if (!user) return;
    setScheduleBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...data } : b));
    const { error } = await supabase.from("schedule_blocks").update(data as any).eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); refreshAll(); }
  }, [user, refreshAll]);

  const removeBlock = useCallback(async (id: string) => {
    if (!user) return;
    const prev = scheduleBlocks;
    setScheduleBlocks((b) => b.filter((x) => x.id !== id));
    const { error } = await supabase.from("schedule_blocks").delete().eq("id", id).eq("user_id", user.id);
    if (error) { console.error(error); setScheduleBlocks(prev); }
  }, [user, scheduleBlocks]);

  const replaceBlocksForDate = useCallback(async (date: string, blocks: Omit<DbScheduleBlock, "id" | "user_id" | "created_at">[]) => {
    if (!user) return;
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
