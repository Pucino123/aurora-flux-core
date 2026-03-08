import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AvatarContextValue {
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  uploadAvatar: (file: File) => Promise<void>;
  uploading: boolean;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).avatar_url) setAvatarUrlState((data as any).avatar_url);
      });
  }, [user]);

  const setAvatarUrl = useCallback((url: string | null) => {
    setAvatarUrlState(url);
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("document-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("document-images").getPublicUrl(path);
      const freshUrl = publicUrl + "?t=" + Date.now();
      await supabase.from("profiles").update({ avatar_url: publicUrl } as any).eq("id", user.id);
      setAvatarUrlState(freshUrl);
    } finally {
      setUploading(false);
    }
  }, [user]);

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl, uploadAvatar, uploading }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatar must be used within AvatarProvider");
  return ctx;
}
