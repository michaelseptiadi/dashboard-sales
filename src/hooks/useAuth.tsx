import { useState, useEffect, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient, { getToken, setToken, removeToken } from "@/lib/apiClient";
import { AuthContextType, ApiUser, Role, Store } from "@/types/Auth";

const STORE_STORAGE_KEY = "selected_store";

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");

    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function userFromToken(token: string): any | null {
  const claims = decodeJwtPayload(token);
  if (!claims) return null;
  return {
    ...claims,
    id: claims.sub,
  };
}

function loadStoredStore(): Store | null {
  try {
    const raw = localStorage.getItem(STORE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch {
    return null;
  }
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

    const tokenUser = userFromToken(token);
    if (tokenUser) {
      setUser(tokenUser);
      setLoading(false);
      return;
    }
  }, []);

  const currentRole: Role | null = (() => {
    if (user?.roles.some((r) => r.role === "manager" || r.role === "superadmin")) return "admin";
    if (user?.roles.some((r) => r.role === "staff")) return "cashier";
    return null;
  })();

  const roleLoading = loading;

  const isSuperAdmin = user?.roles.some((r) => r.role === "superadmin") ?? false;
  const superAdminLoading = loading;

  const signIn = async (email: string, password: string) => {
    try {
      const result = await apiClient.post<{ access_token: string; user?: ApiUser }>(
        "/auth/login",
        { email, password },
      );
      setToken(result.access_token);
      setUser(userFromToken(result.access_token));
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
  const isSuperAdmin = user?.roles.some((r) => r.role === "superadmin") ?? false;

  return useQuery<Store[]>({
    queryKey: ["stores", user?.id, isSuperAdmin],
    queryFn: () => apiClient.get<Store[]>("/stores"),
    enabled: !!user && isSuperAdmin,
  });
}

