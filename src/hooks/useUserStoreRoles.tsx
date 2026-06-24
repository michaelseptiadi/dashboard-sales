import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import type {
  AssignStoreRolePayload,
  BackendRoleName,
  CreateStoreUserPayload,
  StoreUserRoleAssignment,
  UpdateStoreRolePayload,
  UpdateUserPayload,
  UserRecord,
} from "@/types/users";

export function getBackendActorRole(userRoles: { role: string }[] | undefined): BackendRoleName | null {
  if (userRoles?.some((item) => item.role === "superadmin")) return "superadmin";
  if (userRoles?.some((item) => item.role === "manager")) return "manager";
  if (userRoles?.some((item) => item.role === "staff")) return "staff";
  return null;
}

export function useUserApiAccess() {
  const { user } = useAuth();
  const actorRole = getBackendActorRole(user?.roles);

  return {
    actorRole,
    canAccessUsers: actorRole === "superadmin" || actorRole === "manager",
    canAccessStoreRoles: actorRole === "superadmin" || actorRole === "manager",
    canAssignStoreRole: (targetRole: BackendRoleName) =>
      actorRole === "superadmin" || (actorRole === "manager" && targetRole === "staff"),
  };
}

function buildQueryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function useUsers(search?: string) {
  const { canAccessUsers } = useUserApiAccess();

  return useQuery<UserRecord[]>({
    queryKey: ["users", search],
    enabled: canAccessUsers,
    queryFn: () => apiClient.get<UserRecord[]>(`/users${buildQueryString({ search })}`),
  });
}

export function useUserById(userId: string | null) {
  const { canAccessUsers } = useUserApiAccess();

  return useQuery<UserRecord>({
    queryKey: ["user", userId],
    enabled: canAccessUsers && !!userId,
    queryFn: () => apiClient.get<UserRecord>(`/users/${userId}`),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { canAccessUsers } = useUserApiAccess();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateUserPayload & { id: string }) => {
      if (!canAccessUsers) {
        throw new Error("Akses ditolak");
      }
      return apiClient.put<UserRecord>(`/users/${id}`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", variables.id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { canAccessStoreRoles } = useUserApiAccess();

  return useMutation({
    mutationFn: ({ storeId, userId }: { storeId: string; userId: string }) => {
      if (!canAccessStoreRoles) {
        throw new Error("Akses ditolak");
      }
      return apiClient.delete<{ message: string }>(`/stores/${storeId}/user-roles/${userId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["store-user-roles", variables.storeId] });
    },
  });
}

export function useStoreUserRoles(storeId: string | null) {
  const { canAccessStoreRoles } = useUserApiAccess();

  return useQuery<StoreUserRoleAssignment[]>({
    queryKey: ["store-user-roles", storeId],
    enabled: canAccessStoreRoles && !!storeId,
    queryFn: () => apiClient.get<StoreUserRoleAssignment[]>(`/stores/${storeId}/user-roles`),
  });
}

export function useCreateStoreUser() {
  const queryClient = useQueryClient();
  const { canAccessStoreRoles, canAssignStoreRole } = useUserApiAccess();

  return useMutation({
    mutationFn: (payload: CreateStoreUserPayload & { storeId: string }) => {
      if (!canAccessStoreRoles || !canAssignStoreRole(payload.storeRole)) {
        throw new Error("Akses ditolak");
      }
      const { storeId, ...body } = payload;
      return apiClient.post<UserRecord>(`/stores/${storeId}/users`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["store-user-roles", variables.storeId] });
    },
  });
}

export function useAssignStoreUserRole() {
  const queryClient = useQueryClient();
  const { canAccessStoreRoles, canAssignStoreRole } = useUserApiAccess();

  return useMutation({
    mutationFn: (payload: AssignStoreRolePayload & { storeId: string }) => {
      if (!canAccessStoreRoles || !canAssignStoreRole(payload.storeRole)) {
        throw new Error("Akses ditolak");
      }
      const { storeId, ...body } = payload;
      return apiClient.post<StoreUserRoleAssignment>(`/stores/${storeId}/user-roles`, body);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["store-user-roles", variables.storeId] });
    },
  });
}

export function useUpdateStoreUserRole() {
  const queryClient = useQueryClient();
  const { canAccessStoreRoles, canAssignStoreRole } = useUserApiAccess();

  return useMutation({
    mutationFn: ({ storeId, userId, storeRole }: UpdateStoreRolePayload & { userId: string; storeId: string }) => {
      if (!canAccessStoreRoles || !canAssignStoreRole(storeRole)) {
        throw new Error("Akses ditolak");
      }
      return apiClient.put<StoreUserRoleAssignment>(`/stores/${storeId}/user-roles/${userId}`, {
        storeRole,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["store-user-roles", variables.storeId] });
    },
  });
}

export function useRemoveStoreUserRole() {
  const queryClient = useQueryClient();
  const { canAccessStoreRoles } = useUserApiAccess();

  return useMutation({
    mutationFn: ({ storeId, userId }: { storeId: string; userId: string }) => {
      if (!canAccessStoreRoles) {
        throw new Error("Akses ditolak");
      }
      return apiClient.delete<{ message: string }>(`/stores/${storeId}/user-roles/${userId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["store-user-roles", variables.storeId] });
    },
  });
}

export function getStoreRoleLabel(role: BackendRoleName | string) {
  if (role === "superadmin") return "Superadmin";
  if (role === "manager") return "Admin";
  if (role === "staff") return "Kasir";
  return role;
}