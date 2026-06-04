export type BackendRoleName = "superadmin" | "manager" | "staff";

export interface UserStoreRoleStore {
  id: string;
  store_name: string;
  store_code?: string | null;
}

export interface UserStoreRoleRole {
  id: string;
  name: BackendRoleName;
}

export interface UserStoreRoleAssignment {
  id: string;
  user_id: string;
  store_id: string;
  role_id: string;
  created_at: string;
  store?: UserStoreRoleStore;
  role: UserStoreRoleRole;
}

export interface UserRecord {
  id: string;
  email: string;
  phone_number: string | null;
  name: string | null;
  is_active: boolean;
  created_at: string;
  user_store_roles: UserStoreRoleAssignment[];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  phone_number: string;
  name?: string;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  phone_number?: string;
  name?: string;
}

export interface CreateStoreUserPayload {
  email: string;
  password: string;
  phone_number: string;
  name?: string;
  storeRole: BackendRoleName;
}

export interface AssignStoreRolePayload {
  userId: string;
  storeRole: BackendRoleName;
}

export interface UpdateStoreRolePayload {
  storeRole: BackendRoleName;
}

export interface StoreUserRoleAssignment {
  id: string;
  user_id: string;
  store_id: string;
  role_id: string;
  created_at: string;
  role: UserStoreRoleRole;
  user: {
    id: string;
    email: string;
    phone_number: string | null;
    name: string | null;
    is_active: boolean;
  };
}

export interface StoreOption {
  id: string;
  store_name: string;
}
