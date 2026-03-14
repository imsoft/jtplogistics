"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getUsersColumns } from "./users-columns";
import { USER_ROLE_LABELS } from "@/lib/constants/user-role";
import type { User, UserRole } from "@/types/user.types";

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) {
    if (res.status === 401) return [];
    throw new Error("Error al cargar usuarios");
  }
  return res.json();
}

type RoleFilter = UserRole | "all";

export function UsersTable({ defaultRole }: { defaultRole?: UserRole }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(defaultRole ?? "all");

  const loadUsers = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios");
      setUsers([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const columns = useMemo(() => getUsersColumns(), []);

  if (!isLoaded) {
    return <p className="text-muted-foreground">Cargando…</p>;
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
      onRowClick={(user) => router.push(`/admin/dashboard/users/${user.id}`)}
      toolbar={
        !defaultRole ? (
          <>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((role) => (
                  <SelectItem key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
