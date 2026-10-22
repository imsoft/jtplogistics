"use client";

import { EditLeadView } from "@/components/dashboard/client-leads/lead-views";

export default function EditClientLeadPage() {
  return <EditLeadView basePath="/admin/dashboard/client-leads" canDelete />;
}
