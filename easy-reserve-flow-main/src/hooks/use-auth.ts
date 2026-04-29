import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "worker";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchRole = async (uid: string | undefined) => {
      if (!uid) {
        setRole(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();
      if (active) setRole((data?.role as AppRole) ?? "user");
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Defer Supabase calls to avoid deadlocks
      setTimeout(() => fetchRole(newSession?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (!active) return;
      setSession(existing);
      setUser(existing?.user ?? null);
      fetchRole(existing?.user?.id).finally(() => {
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { session, user, role, loading };
}
