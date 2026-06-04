export interface AuthContextType {
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
  signOut: () => Promise<void>;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  roles: Roles[];
}

interface Roles {
  storeId: string;
  storeCode: string;
  storeName: string;
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