"use client";

import { useState } from "react";
import { ActaForm } from "@/components/dashboard/hr/acta-form";
import { ActasList } from "@/components/dashboard/hr/hr-records";

/** Formulario del acta y, debajo, las actas ya registradas. */
export function ActaPageContent({ responsibleName, employeesEndpoint }: { responsibleName: string; employeesEndpoint: string }) {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="space-y-6">
      <ActaForm responsibleName={responsibleName} employeesEndpoint={employeesEndpoint} onSaved={() => setReloadKey((k) => k + 1)} />
      <ActasList endpoint="/api/hr/actas" title="Actas registradas" showEmployee reloadKey={reloadKey} />
    </div>
  );
}
