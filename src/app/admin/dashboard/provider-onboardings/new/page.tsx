"use client";

import { Suspense } from "react";
import { NewOnboardingView } from "@/components/dashboard/provider-onboardings/onboarding-views";

export default function NewProviderOnboardingPage() {
  return (
    <Suspense>
      <NewOnboardingView basePath="/admin/dashboard/provider-onboardings" />
    </Suspense>
  );
}
