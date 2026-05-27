import { useState, useEffect, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient, { getToken, setToken, removeToken } from "@/lib/apiClient";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  role: string;
}

export interface Store {
  id: string;
  store_name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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

// ── Context ───────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: ApiUser | null;
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
  const [user, setUser] = useState<ApiUser | null>(null);
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

  // Rehydrate user from stored token on mount.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get<{ id: string; email: string; user_roles?: { role: string }[] }>("/users/me")
      .then((me) => {
        setUser({
          id: me.id,
          email: me.email,
          role: me.user_roles?.[0]?.role ?? "staff",
        });
      })
      .catch(() => {
        // Token invalid or expired – clear it
        removeToken();
      })
      .finally(() => setLoading(false));
  }, []);

  // Store-level role for the currently selected store.
  // TODO: Replace with a proper per-store role query once the backend exposes
  //       GET /users/me/store-roles with the current store filtered.
  const { data: storeRoles = [], isLoading: roleLoading } = useQuery({
    queryKey: ["my-store-roles", user?.id],
    queryFn: () =>
      apiClient.get<{ role: string; store: { id: string } }[]>("/users/me/store-roles"),
    enabled: !!user,
  });

  const currentRole: Role | null = (() => {
    if (!selectedStore) return null;
    const match = storeRoles.find((r) => r.store.id === selectedStore.id);
    if (match) return match.role as Role;
    // Fall back to global role when no explicit store assignment exists.
    if (user?.role === "admin" || user?.role === "superadmin") return "admin";
    if (user?.role === "cashier") return "cashier";
    return null;
  })();

  const isSuperAdmin = user?.role === "superadmin";
  const superAdminLoading = loading;

  const signIn = async (email: string, password: string) => {
    try {
      const result = await apiClient.post<{ access_token: string; user: ApiUser }>(
        "/auth/login",
        { email, password },
      );
      setToken(result.access_token);
      setUser(result.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const result = await apiClient.post<{ access_token: string; user: ApiUser }>(
        "/auth/register",
        { email, password },
      );
      setToken(result.access_token);
      setUser(result.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    removeToken();
    setUser(null);
    setSelectedStoreState(null);
    localStorage.removeItem(STORE_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        selectedStore,
        setSelectedStore,
        storeModalOpen,
        setStoreModalOpen,
        currentRole,
        roleLoading,
        isSuperAdmin,
        superAdminLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
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
  const { user } = useAuth();
  return useQuery<Store[]>({
    queryKey: ["stores", user?.id],
    queryFn: () => apiClient.get<Store[]>("/stores"),
    enabled: !!user,
  });
}

