"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { USER_ROLE_LABELS } from "@/lib/constants/user-role";
import type { User } from "@/types/user.types";

export function getUsersColumns(): ColumnDef<User>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.profile?.commercialName ?? ""} ${row.name} ${row.email} ${USER_ROLE_LABELS[row.role]}`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "commercialName",
      accessorFn: (row) => row.profile?.commercialName ?? "",
      header: ({ column }) => <SortableColumnHeader column={column} title="Nombre comercial" />,
      cell: ({ row }) => {
        const name = row.original.profile?.commercialName;
        return name
          ? <span className="font-medium">{name}</span>
          : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <SortableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableColumnHeader column={column} title="Correo electrónico" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => <SortableColumnHeader column={column} title="Rol" />,
      cell: ({ row }) =>
        USER_ROLE_LABELS[row.getValue("role") as User["role"]],
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumnHeader column={column} title="Registro" />,
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return new Date(date).toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
  ];
}
