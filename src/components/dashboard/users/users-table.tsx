"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { getUsersColumns } from "./users-columns";
import { USER_ROLE_LABELS } from "@/lib/constants/user-role";
import type { User, UserRole } from "@/types/user.types";

async function fetchUsers(endpoint: string): Promise<User[]> {
  const res = await fetch(endpoint);
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Error al cargar usuarios");
  }
  return res.json();
}

type RoleFilter = UserRole | "all";

export function UsersTable({
  defaultRole,
  detailBasePath,
  apiEndpoint = "/api/admin/users",
}: {
  defaultRole?: UserRole;
  detailBasePath?: string;
  apiEndpoint?: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(defaultRole ?? "all");

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchUsers(apiEndpoint);
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios");
      setUsers([]);
    } finally {
      setIsLoaded(true);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const columns = useMemo(() => getUsersColumns(), []);

  if (!isLoaded) {
    return <DataTableSkeleton />;
  }

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (filteredUsers.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay usuarios registrados.
      </p>
    );
  }

  return (
    <DataTable<User, unknown>
      columns={columns}
      data={filteredUsers}
      filterColumn="search"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(user) => {
        const base = detailBasePath ?? "/admin/dashboard/users";
        const from = detailBasePath ? `?from=${encodeURIComponent(detailBasePath)}` : "";
        router.push(`${base}/${user.id}${from}`);
      }}
      toolbar={
        !defaultRole ? (
          <>
            <AppSelect
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as RoleFilter)}
              options={[{value: "all", label: "Todos los roles"}, ...(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((role) => ({value: role, label: USER_ROLE_LABELS[role]}))]}
              className="w-full sm:w-[160px]"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setRoleFilter("all")}
            >
              Limpiar filtros
            </Button>
          </>
        ) : undefined
      }
    />
  );
}
