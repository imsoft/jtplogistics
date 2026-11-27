"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { USER_ROLE_LABELS } from "@/lib/constants/user-role";
import type { User } from "@/types/user.types";
import { StarRating } from "@/components/ui/star-rating";

/** Llave para empatar la evaluación con el proveedor: su razón social. */
export const ratingKey = (legalName: string | null | undefined) => (legalName ?? "").trim().toLowerCase();

/**
 * `starsByLegalName`: solo en la lista de proveedores; agrega la columna de
 * evaluación (la calificación que cuenta, con el ajuste de JTP si lo hay).
 */
export function getUsersColumns(starsByLegalName?: Map<string, number>): ColumnDef<User>[] {
  const ratingColumn: ColumnDef<User>[] = starsByLegalName
    ? [
        {
          id: "evaluation",
          accessorFn: (row) => starsByLegalName.get(ratingKey(row.profile?.legalName)) ?? -1,
          header: ({ column }) => <SortableColumnHeader column={column} title="Evaluación" />,
          cell: ({ row }) => {
            const stars = starsByLegalName.get(ratingKey(row.original.profile?.legalName));
            return stars != null ? <StarRating stars={stars} showNumber /> : <span className="text-muted-foreground text-xs">Sin embarques</span>;
          },
        },
      ]
    : [];
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
      meta: { className: "hidden @3xl/table:table-cell" },
      accessorFn: (row) => row.profile?.commercialName ?? "",
      header: ({ column }) => <SortableColumnHeader column={column} title="Nombre comercial" />,
      cell: ({ row }) => {
        const name = row.original.profile?.commercialName;
        return name
          ? <span className="font-medium">{name}</span>
          : <span className="text-muted-foreground">—</span>;
      },
    },
    ...ratingColumn,
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
        <span className="text-muted-foreground text-email">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "role",
      meta: { className: "hidden @xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Rol" />,
      cell: ({ row }) =>
        USER_ROLE_LABELS[row.getValue("role") as User["role"]],
    },
    {
      accessorKey: "createdAt",
      meta: { className: "hidden @4xl/table:table-cell" },
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
