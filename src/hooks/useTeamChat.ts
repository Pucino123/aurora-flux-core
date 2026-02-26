import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Team {
  id: string;
  name: string;
  created_by: string;
}

export interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  display_name?: string;
}

const LAST_READ_KEY = "colab_last_read";

function getLastReadMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LAST_READ_KEY) || "{}");
  } catch {
    return {};
  }
}

function setLastReadMap(map: Record<string, number>) {
  localStorage.setItem(LAST_READ_KEY, JSON.stringify(map));
}

export function useTeamChat() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [lastReadMap, setLastReadMapState] = useState<Record<string, number>>(getLastReadMap);

  // Fetch teams the user belongs to
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberRows, error } = await (supabase as any)
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to fetch team memberships:", error);
        setLoading(false);
        return;
      }

      if (memberRows && memberRows.length > 0) {
        const teamIds = memberRows.map((r: any) => r.team_id);
        const { data: teamRows } = await (supabase as any)
          .from("teams")
          .select("*")
          .in("id", teamIds);
        setTeams((teamRows || []) as Team[]);
        if (!activeTeamId && teamRows && teamRows.length > 0) {
          setActiveTeamId(teamRows[0].id);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  // Fetch messages & members when active team changes
  useEffect(() => {
    if (!activeTeamId || !user) return;

    (async () => {
      const [msgRes, memRes] = await Promise.all([
        (supabase as any)
          .from("team_messages")
          .select("*")
          .eq("team_id", activeTeamId)
          .order("created_at", { ascending: true })
          .limit(100),
        (supabase as any)
          .from("team_members")
          .select("*")
          .eq("team_id", activeTeamId),
      ]);
      setMessages((msgRes.data || []) as TeamMessage[]);
      setMembers((memRes.data || []) as TeamMember[]);
    })();

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`team-messages-${activeTeamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_messages",
          filter: `team_id=eq.${activeTeamId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as TeamMessage];
          });
        }
      )
      .subscribe();

    // Presence for online indicator
    const presenceChannel = supabase.channel(`team-presence-${activeTeamId}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUsers(Object.keys(state));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [activeTeamId, user]);

  // Unread count: messages newer than lastReadAt for the active team NOT from current user
  const unreadCount = useMemo(() => {
    if (!user) return 0;
    let total = 0;
    for (const team of teams) {
      const lastRead = lastReadMap[team.id] || 0;
      // If this team is NOT currently active, count all messages since lastRead from others
      // If active, still count (they may not have opened the modal)
      total += messages.filter(
        (m) => m.team_id === team.id &&
          m.user_id !== user.id &&
          new Date(m.created_at).getTime() > lastRead
      ).length;
    }
    return total;
  }, [messages, teams, lastReadMap, user]);

  const markAsRead = useCallback(() => {
    if (!activeTeamId) return;
    const updated = { ...getLastReadMap(), [activeTeamId]: Date.now() };
    setLastReadMap(updated);
    setLastReadMapState(updated);
  }, [activeTeamId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !activeTeamId || !content.trim()) return;
      const { error } = await (supabase as any).from("team_messages").insert({
        team_id: activeTeamId,
        user_id: user.id,
        content: content.trim(),
      });
      if (error) console.error("Failed to send message:", error);
    },
    [user, activeTeamId]
  );

  const createTeam = useCallback(
    async (name: string) => {
      if (!user) return null;
      const { data: team, error: teamError } = await (supabase as any)
        .from("teams")
        .insert({ name, created_by: user.id })
        .select()
        .single();
      if (teamError || !team) {
        console.error("Failed to create team:", teamError);
        return null;
      }

      // Add creator as admin member
      const { error: memberError } = await (supabase as any).from("team_members").insert({
        team_id: (team as any).id,
        user_id: user.id,
        role: "admin",
      });
      if (memberError) {
        console.error("Failed to add creator as admin member:", memberError);
        return null;
      }

      const newTeam = team as Team;
      setTeams((prev) => [...prev, newTeam]);
      setActiveTeamId(newTeam.id);
      return newTeam;
    },
    [user]
  );

  const inviteMember = useCallback(
    async (email: string) => {
      if (!activeTeamId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!profile) return { error: "User not found" };
      const { error } = await (supabase as any).from("team_members").insert({
        team_id: activeTeamId,
        user_id: profile.id,
        role: "member",
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    [activeTeamId]
  );

  return {
    teams,
    activeTeamId,
    setActiveTeamId,
    messages,
    members,
    onlineUsers,
    loading,
    unreadCount,
    markAsRead,
    sendMessage,
    createTeam,
    inviteMember,
    hasTeams: teams.length > 0,
  };
}
