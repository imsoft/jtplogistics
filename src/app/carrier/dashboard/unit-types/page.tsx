"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { CardListSkeleton } from "@/components/ui/skeletons";

export default function CarrierUnitTypesIndexPage() {
  const router = useRouter();
  const unitTypes = useUnitTypes();

  useEffect(() => {
    if (unitTypes.length > 0) {
      router.replace(`/carrier/dashboard/unit-types/${unitTypes[0].value}`);
    }
  }, [unitTypes, router]);

  return <CardListSkeleton cards={4} lines={1} />;
}
