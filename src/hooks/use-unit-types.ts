"use client";

import { useState, useEffect } from "react";
import { UNIT_TYPE_FALLBACK } from "@/lib/constants/unit-type";

export function useUnitTypes() {
  const [unitTypes, setUnitTypes] = useState(UNIT_TYPE_FALLBACK);

  useEffect(() => {
    fetch("/api/unit-types")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setUnitTypes(data);
      })
      .catch(() => {});
  }, []);

  return unitTypes;
}
