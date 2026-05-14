import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type Store = Database["public"]["Tables"]["stores"]["Row"];

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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    setSelectedStore(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, selectedStore, setSelectedStore, storeModalOpen, setStoreModalOpen, signIn, signUp, signOut }}>
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
  return useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      let query = supabase.from("stores").select("*").order("store_name");

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}