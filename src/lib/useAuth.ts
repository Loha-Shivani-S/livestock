import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check for demo user first (for zero-friction local jury presentations)
    if (typeof window !== "undefined") {
      const demoStr = localStorage.getItem("pashu_demo_user");
      if (demoStr) {
        try {
          const parsed = JSON.parse(demoStr);
          if (parsed && parsed.id) {
            setUser(parsed);
            setLoading(false);
            return;
          }
        } catch {}
      }
    }

    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2500);

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInDemo = (role: "bvo" | "paravet" | "farmer") => {
    const demoProfiles: Record<string, User> = {
      bvo: {
        id: "usr-bvo-demo",
        app_metadata: {},
        user_metadata: {
          full_name: "Dr. Suresh Patil (BVO)",
          designation: "Block Veterinary Officer, Dindori",
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User,
      paravet: {
        id: "usr-paravet-demo",
        app_metadata: {},
        user_metadata: {
          full_name: "Ramesh Gaikwad (Para-vet)",
          designation: "Live-stock Development Officer",
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User,
      farmer: {
        id: "usr-farmer-demo",
        app_metadata: {},
        user_metadata: {
          full_name: "Santosh Kadam (Dairy Farmer)",
          designation: "Livestock Owner, Dindori",
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User,
    };

    const chosen = demoProfiles[role] || demoProfiles.bvo;
    if (typeof window !== "undefined") {
      localStorage.setItem("pashu_demo_user", JSON.stringify(chosen));
      localStorage.setItem("pashu_demo_token", `demo-${role}-token`);
    }
    setUser(chosen);
  };

  const loginUserDirect = (userData: { id: string; email: string; full_name?: string; designation?: string }) => {
    const userObj: User = {
      id: userData.id,
      app_metadata: {},
      user_metadata: {
        full_name: userData.full_name || userData.email.split("@")[0],
        designation: userData.designation || "Officer",
      },
      email: userData.email,
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User;

    if (typeof window !== "undefined") {
      localStorage.setItem("pashu_demo_user", JSON.stringify(userObj));
      localStorage.setItem("pashu_demo_token", `pashu-session-${userObj.id}`);
    }
    setUser(userObj);
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pashu_demo_user");
      localStorage.removeItem("pashu_demo_token");
    }
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  };

  return { user, loading, signInDemo, loginUserDirect, signOut };
}
