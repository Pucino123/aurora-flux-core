import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.png", badge: "/favicon.png" });
  } catch { /* ignore */ }
}

// Consistent color per user based on their id
export function getUserColor(userId: string): string {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
    "bg-rose-500", "bg-cyan-500", "bg-pink-500", "bg-indigo-500",
    "bg-teal-500", "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

export function useTeamChat() {
  const { user } = useAuth();

  // All refs first (stable across renders)
  const modalOpenRef = useRef(false);
  const initialLoadRef = useRef(true);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isTypingRef = useRef(false);
  const typingResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // All state
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastReadMap, setLastReadMapState] = useState<Record<string, number>>(getLastReadMap);

  // Fetch teams the user belongs to
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
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
        const fetchedTeams = (teamRows || []) as Team[];
        setTeams(fetchedTeams);
        setActiveTeamId((prev) => {
          if (prev && fetchedTeams.some(t => t.id === prev)) return prev;
          return fetchedTeams.length > 0 ? fetchedTeams[0].id : null;
        });
      } else {
        setTeams([]);
      }
      setLoading(false);
    })();
  }, [user]);

  // Fetch messages & members when active team changes
  useEffect(() => {
    if (!activeTeamId || !user) return;
    initialLoadRef.current = true;
    setTypingUsers([]);

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
      setTimeout(() => { initialLoadRef.current = false; }, 500);
    })();

    // Realtime subscription for new messages
    const channel = supabase
      .channel(`team-messages-${activeTeamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `team_id=eq.${activeTeamId}` },
        (payload) => {
          const newMsg = payload.new as TeamMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Clear typing indicator when message arrives
          setTypingUsers((prev) => prev.filter((uid) => uid !== newMsg.user_id));
          if (!initialLoadRef.current && newMsg.user_id !== user.id && !modalOpenRef.current) {
            setMembers((currentMembers) => {
              const sender = currentMembers.find(m => m.user_id === newMsg.user_id);
              const senderName = (sender as any)?.display_name || "Someone";
              sendBrowserNotification(`New message from ${senderName}`, newMsg.content);
              return currentMembers;
            });
          }
        }
      )
      .subscribe();

    // Presence for online + typing indicators
    const presenceChannel = supabase.channel(`team-presence-${activeTeamId}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<{ user_id: string; typing?: boolean }>();
        const onlineIds = Object.keys(state);
        setOnlineUsers(onlineIds);
        const typingIds = onlineIds.filter((uid) => {
          const presence = state[uid]?.[0];
          return presence?.typing && uid !== user.id;
        });
        setTypingUsers(typingIds);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }: any) => {
        if (key !== user.id && newPresences?.[0]?.typing) {
          setTypingUsers((prev) => prev.includes(key) ? prev : [...prev, key]);
          // Auto-clear after 5s
          if (typingTimeoutRef.current[key]) clearTimeout(typingTimeoutRef.current[key]);
          typingTimeoutRef.current[key] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== key));
          }, 5000);
        }
      })
      .on("presence", { event: "leave" }, ({ key }: any) => {
        setTypingUsers((prev) => prev.filter((u) => u !== key));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ user_id: user.id, typing: false });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, [activeTeamId, user]);

  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    if (!presenceChannelRef.current || !user) return;
    await presenceChannelRef.current.track({ user_id: user.id, typing: isTyping });
  }, [user]);

  const handleTypingChange = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      broadcastTyping(true);
    }
    if (typingResetRef.current) clearTimeout(typingResetRef.current);
    typingResetRef.current = setTimeout(() => {
      isTypingRef.current = false;
      broadcastTyping(false);
    }, 2000);
  }, [broadcastTyping]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    let total = 0;
    for (const team of teams) {
      const lastRead = lastReadMap[team.id] || 0;
      total += messages.filter(
        (m) => m.team_id === team.id && m.user_id !== user.id && new Date(m.created_at).getTime() > lastRead
      ).length;
    }
    return total;
  }, [messages, teams, lastReadMap, user]);

  // Per-team unread counts
  const unreadPerTeam = useMemo(() => {
    if (!user) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const team of teams) {
      const lastRead = lastReadMap[team.id] || 0;
      map[team.id] = messages.filter(
        (m) => m.team_id === team.id && m.user_id !== user.id && new Date(m.created_at).getTime() > lastRead
      ).length;
    }
    return map;
  }, [messages, teams, lastReadMap, user]);

  const markAsRead = useCallback(() => {
    if (!activeTeamId) return;
    const updated = { ...getLastReadMap(), [activeTeamId]: Date.now() };
    setLastReadMap(updated);
    setLastReadMapState(updated);
  }, [activeTeamId]);

  const setModalOpen = useCallback((open: boolean) => {
    modalOpenRef.current = open;
    if (open) requestNotificationPermission();
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !activeTeamId || !content.trim()) return;
      // Stop typing indicator
      isTypingRef.current = false;
      broadcastTyping(false);
      const { error } = await (supabase as any).from("team_messages").insert({
        team_id: activeTeamId,
        user_id: user.id,
        content: content.trim(),
      });
      if (error) console.error("Failed to send message:", error);
    },
    [user, activeTeamId, broadcastTyping]
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
      const { error: memberError } = await (supabase as any).from("team_members").insert({
        team_id: (team as any).id,
        user_id: user.id,
        role: "admin",
        display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Admin",
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

  const deleteTeam = useCallback(
    async (teamId: string) => {
      if (!user) return { error: "Not authenticated" };
      await (supabase as any).from("team_messages").delete().eq("team_id", teamId);
      await (supabase as any).from("team_members").delete().eq("team_id", teamId);
      const { error } = await (supabase as any).from("teams").delete().eq("id", teamId);
      if (error) return { error: error.message };
      setTeams((prev) => {
        const updated = prev.filter((t) => t.id !== teamId);
        setActiveTeamId(updated.length > 0 ? updated[0].id : null);
        return updated;
      });
      setMessages([]);
      return { error: null };
    },
    [user]
  );

  const leaveTeam = useCallback(
    async (teamId: string) => {
      if (!user) return { error: "Not authenticated" };
      const { error } = await (supabase as any)
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", user.id);
      if (error) return { error: error.message };
      setTeams((prev) => {
        const updated = prev.filter((t) => t.id !== teamId);
        setActiveTeamId(updated.length > 0 ? updated[0].id : null);
        return updated;
      });
      if (teamId === activeTeamId) setMessages([]);
      return { error: null };
    },
    [user, activeTeamId]
  );

  const inviteMember = useCallback(
    async (email: string) => {
      if (!activeTeamId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("email", email)
        .maybeSingle();
      if (!profile) return { error: "User not found" };
      const { error } = await (supabase as any).from("team_members").insert({
        team_id: activeTeamId,
        user_id: profile.id,
        role: "member",
        display_name: profile.display_name,
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
    typingUsers,
    loading,
    unreadCount,
    unreadPerTeam,
    markAsRead,
    setModalOpen,
    sendMessage,
    createTeam,
    leaveTeam,
    deleteTeam,
    inviteMember,
    handleTypingChange,
    hasTeams: teams.length > 0,
  };
}
