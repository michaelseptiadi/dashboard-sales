import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type Store = Database["public"]["Tables"]["stores"]["Row"];
export type Role = "admin" | "cashier";

const STORE_STORAGE_KEY = "selected_store";

function loadStoredStore(): Store | null {
  try {
    const raw = localStorage.getItem(STORE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  storeModalOpen: boolean;
  setStoreModalOpen: (open: boolean) => void;
  currentRole: Role | null;
  roleLoading: boolean;
  isSuperAdmin: boolean;
  superAdminLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStoreState] = useState<Store | null>(loadStoredStore);
  const [storeModalOpen, setStoreModalOpen] = useState(false);

  const setSelectedStore = (store: Store | null) => {
    setSelectedStoreState(store);
    setStoreModalOpen(false);
    if (store) {
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(store));
    } else {
      localStorage.removeItem(STORE_STORAGE_KEY);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Store-level role for the currently selected store
  const { data: currentRole = null, isLoading: roleLoading } = useQuery({
    queryKey: ["user_role", user?.id, selectedStore?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_store_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("store_id", selectedStore!.id)
        .single();
      if (error) return null;
      return (data?.role as Role) ?? null;
    },
    enabled: !!user && !!selectedStore,
  });

  // App-level superadmin flag
  const { data: isSuperAdmin = false, isLoading: superAdminLoading } = useQuery({
    queryKey: ["is_superadmin", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user!.id)
        .eq("role", "superadmin")
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSelectedStoreState(null);
    localStorage.removeItem(STORE_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, selectedStore, setSelectedStore, storeModalOpen, setStoreModalOpen, currentRole, roleLoading, isSuperAdmin, superAdminLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useStoresList() {
  const { user, isSuperAdmin, superAdminLoading } = useAuth();
  return useQuery({
    queryKey: ["stores", user?.id, isSuperAdmin],
    queryFn: async () => {
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .from("stores")
          .select("*")
          .eq("is_active", true)
          .order("store_name");
        if (error) throw error;
        return data ?? [];
      }
      const { data, error } = await supabase
        .from("user_store_roles")
        .select("store:stores(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.store as Store | null)
        .filter((s): s is Store => s !== null && s.is_active);
    },
    enabled: !!user && !superAdminLoading,
  });
}

