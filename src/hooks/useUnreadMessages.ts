/**
 * useUnreadMessages
 * Lightweight hook that tracks unread team message count in real-time.
 * Uses localStorage timestamps (same key as useTeamChat) so both
 * hooks stay in sync when the user marks messages as read.
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LAST_READ_KEY = "colab_last_read";

function getLastReadMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY) || "{}");
  } catch {
    return {};
  }
}

export function useUnreadMessages(): number {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  // Store messages per team so we can recalculate without re-fetching
  const msgsRef = useRef<Record<string, { user_id: string; created_at: string }[]>>({});
  const teamIdsRef = useRef<string[]>([]);

  const recalculate = () => {
    if (!user) { setUnreadCount(0); return; }
    const lastReadMap = getLastReadMap();
    let total = 0;
    for (const teamId of teamIdsRef.current) {
      const lastRead = lastReadMap[teamId] || 0;
      const msgs = msgsRef.current[teamId] || [];
      total += msgs.filter(
        (m) => m.user_id !== user.id && new Date(m.created_at).getTime() > lastRead
      ).length;
    }
    setUnreadCount(total);
  };

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }

    let channels: ReturnType<typeof supabase.channel>[] = [];

    const init = async () => {
      // 1. Fetch team memberships
      const { data: memberRows } = await (supabase as any)
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

      if (!memberRows || memberRows.length === 0) {
        setUnreadCount(0);
        return;
      }

      const teamIds: string[] = memberRows.map((r: any) => r.team_id);
      teamIdsRef.current = teamIds;

      // 2. Fetch recent messages for all teams (last 200 per team)
      await Promise.all(
        teamIds.map(async (teamId) => {
          const { data } = await (supabase as any)
            .from("team_messages")
            .select("user_id, created_at")
            .eq("team_id", teamId)
            .order("created_at", { ascending: false })
            .limit(200);
          msgsRef.current[teamId] = (data || []).reverse();
        })
      );

      recalculate();

      // 3. Subscribe to new messages on each team
      for (const teamId of teamIds) {
        const ch = supabase
          .channel(`unread-badge-${teamId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "team_messages",
              filter: `team_id=eq.${teamId}`,
            },
            (payload) => {
              const msg = payload.new as { user_id: string; created_at: string };
              msgsRef.current[teamId] = [...(msgsRef.current[teamId] || []), msg];
              recalculate();
            }
          )
          .subscribe();
        channels.push(ch);
      }
    };

    init();

    // Re-calculate when the user marks messages as read elsewhere
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_READ_KEY) recalculate();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return unreadCount;
}
