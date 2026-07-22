import { UnitTypesManager } from "@/components/dashboard/unit-types/unit-types-manager";

export const metadata = {
  title: "Tipos de Unidades | JTP Logistics",
  description: "Gestionar tipos de unidades",
};

export default function UnitTypesPage() {
  return (
    <UnitTypesManager
      apiBase="/api/admin/unit-types"
      newHref="/admin/dashboard/unit-types/new"
    />
  );
}
