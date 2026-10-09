"use client";

import { EditOnboardingView } from "@/components/dashboard/provider-onboardings/onboarding-views";

export default function EditProviderOnboardingPage() {
  return <EditOnboardingView basePath="/admin/dashboard/provider-onboardings" canDelete />;
}
