import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

// Generic cloud CRUD hooks for each table

export function useFolders() {
  const { user } = useAuth();

  const fetchFolders = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });
    if (error) { console.error("fetchFolders:", error); return []; }
    return data || [];
  }, [user]);

  const upsertFolder = useCallback(async (folder: {
    id?: string; parent_id?: string | null; title: string; type: string; color?: string | null; sort_order?: number;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("folders")
      .upsert({ ...folder, user_id: user.id }, { onConflict: "id" })
      .select()
      .single();
    if (error) { console.error("upsertFolder:", error); return null; }
    return data;
  }, [user]);

  const deleteFolder = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("folders").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  return { fetchFolders, upsertFolder, deleteFolder };
}

export function useTasks() {
  const { user } = useAuth();

  const fetchTasks = useCallback(async (folderId?: string) => {
    if (!user) return [];
    let q = supabase.from("tasks").select("*").eq("user_id", user.id);
    if (folderId) q = q.eq("folder_id", folderId);
    const { data, error } = await q.order("sort_order", { ascending: true });
    if (error) { console.error("fetchTasks:", error); return []; }
    return data || [];
  }, [user]);

  const fetchTodayTasks = useCallback(async () => {
    if (!user) return [];
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("done", false)
      .or(`due_date.lte.${today},priority.eq.high`);
    if (error) { console.error("fetchTodayTasks:", error); return []; }
    return data || [];
  }, [user]);

  const upsertTask = useCallback(async (task: Record<string, any>) => {
    if (!user) return null;
    const payload = { ...task, user_id: user.id };
    if (task.id) {
      const { data, error } = await supabase.from("tasks").update(payload as any).eq("id", task.id).select().single();
      if (error) { console.error("upsertTask:", error); return null; }
      return data;
    }
    const { data, error } = await supabase.from("tasks").insert(payload as any).select().single();
    if (error) { console.error("upsertTask:", error); return null; }
    return data;
  }, [user]);

  const deleteTask = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  return { fetchTasks, fetchTodayTasks, upsertTask, deleteTask };
}

export function useGoals() {
  const { user } = useAuth();

  const fetchGoals = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { console.error("fetchGoals:", error); return []; }
    return data || [];
  }, [user]);

  const upsertGoal = useCallback(async (goal: Record<string, any>) => {
    if (!user) return null;
    const payload = { ...goal, user_id: user.id };
    if (goal.id) {
      const { data, error } = await supabase.from("goals").update(payload as any).eq("id", goal.id).select().single();
      if (error) { console.error("upsertGoal:", error); return null; }
      return data;
    }
    const { data, error } = await supabase.from("goals").insert(payload as any).select().single();
    if (error) { console.error("upsertGoal:", error); return null; }
    return data;
  }, [user]);

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("goals").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  return { fetchGoals, upsertGoal, deleteGoal };
}

export function useWorkouts() {
  const { user } = useAuth();

  const fetchWorkouts = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (error) { console.error("fetchWorkouts:", error); return []; }
    return data || [];
  }, [user]);

  const insertWorkout = useCallback(async (workout: { date: string; activity: string; energy: number; mood: string }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("workouts")
      .insert({ ...workout, user_id: user.id })
      .select()
      .single();
    if (error) { console.error("insertWorkout:", error); return null; }
    return data;
  }, [user]);

  const updateWorkout = useCallback(async (id: string, updates: Record<string, any>) => {
    if (!user) return;
    await supabase.from("workouts").update(updates).eq("id", id).eq("user_id", user.id);
  }, [user]);

  const deleteWorkout = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("workouts").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  return { fetchWorkouts, insertWorkout, updateWorkout, deleteWorkout };
}

export function useScheduleBlocks() {
  const { user } = useAuth();

  const fetchBlocks = useCallback(async (date?: string) => {
    if (!user) return [];
    let q = supabase.from("schedule_blocks").select("*").eq("user_id", user.id);
    if (date) q = q.eq("scheduled_date", date);
    const { data, error } = await q.order("time", { ascending: true });
    if (error) { console.error("fetchBlocks:", error); return []; }
    return data || [];
  }, [user]);

  const upsertBlock = useCallback(async (block: Record<string, any>) => {
    if (!user) return null;
    const payload = { ...block, user_id: user.id };
    if (block.id) {
      const { data, error } = await supabase.from("schedule_blocks").update(payload as any).eq("id", block.id).select().single();
      if (error) { console.error("upsertBlock:", error); return null; }
      return data;
    }
    const { data, error } = await supabase.from("schedule_blocks").insert(payload as any).select().single();
    if (error) { console.error("upsertBlock:", error); return null; }
    return data;
  }, [user]);

  const deleteBlock = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("schedule_blocks").delete().eq("id", id).eq("user_id", user.id);
  }, [user]);

  return { fetchBlocks, upsertBlock, deleteBlock };
}
