"use client";

import { useState, useEffect } from "react";
import { INCIDENT_TYPE_FALLBACK } from "@/lib/constants/incident-type";

export function useIncidentTypes() {
  const [incidentTypes, setIncidentTypes] = useState(INCIDENT_TYPE_FALLBACK);

  useEffect(() => {
    fetch("/api/incident-types")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setIncidentTypes(data);
      })
      .catch(() => {});
  }, []);

  return incidentTypes;
}
