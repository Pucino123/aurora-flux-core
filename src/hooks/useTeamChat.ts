import { useState, useEffect, useCallback } from "react";
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

export function useTeamChat() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Fetch teams the user belongs to
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: memberRows } = await (supabase as any)
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id);

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

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !activeTeamId || !content.trim()) return;
      await (supabase as any).from("team_messages").insert({
        team_id: activeTeamId,
        user_id: user.id,
        content: content.trim(),
      });
    },
    [user, activeTeamId]
  );

  const createTeam = useCallback(
    async (name: string) => {
      if (!user) return null;
      const { data: team, error } = await (supabase as any)
        .from("teams")
        .insert({ name, created_by: user.id })
        .select()
        .single();
      if (error || !team) return null;

      // Add creator as member
      await (supabase as any).from("team_members").insert({
        team_id: (team as any).id,
        user_id: user.id,
        role: "admin",
      });

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
      // Look up user by email in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!profile) return { error: "User not found" };
      await (supabase as any).from("team_members").insert({
        team_id: activeTeamId,
        user_id: profile.id,
        role: "member",
      });
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
    sendMessage,
    createTeam,
    inviteMember,
    hasTeams: teams.length > 0,
  };
}
