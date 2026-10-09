"use client";

import { Suspense } from "react";
import { NewOnboardingView } from "@/components/dashboard/provider-onboardings/onboarding-views";

export default function NewCollaboratorProviderOnboardingPage() {
  return (
    <Suspense>
      <NewOnboardingView basePath="/collaborator/dashboard/provider-onboardings" />
    </Suspense>
  );
}
