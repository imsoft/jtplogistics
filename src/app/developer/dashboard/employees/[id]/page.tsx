"use client";

import { EmployeeProfileView } from "@/components/dashboard/resources/employee-profile-view";

/**
 * Soporte de TI ve la ficha completa pero no edita al colaborador: eso sigue
 * siendo de dirección. Lo que sí puede es restablecerle la contraseña.
 */
export default function DeveloperEmployeeProfilePage() {
  return (
    <EmployeeProfileView
      apiEndpoint="/api/developer/employees"
      listPath="/developer/dashboard/employees"
      resourcesBasePath={null}
      canResetPassword
    />
  );
}
