"use client";

import { useParams } from "next/navigation";
import { EmployeeProfileView } from "@/components/dashboard/resources/employee-profile-view";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <EmployeeProfileView
      apiEndpoint="/api/admin/employees"
      listPath="/admin/dashboard/employees"
      resourcesBasePath="/admin/dashboard"
      editPath={`/admin/dashboard/employees/${id}/edit`}
      canResetPassword
    />
  );
}
