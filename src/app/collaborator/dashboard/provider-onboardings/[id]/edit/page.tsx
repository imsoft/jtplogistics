"use client";

import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { EditOnboardingView } from "@/components/dashboard/provider-onboardings/onboarding-views";

export default function EditCollaboratorProviderOnboardingPage() {
  const { permissions } = useCollaboratorPermissions();
  return (
    <EditOnboardingView
      basePath="/collaborator/dashboard/provider-onboardings"
      canDelete={permissions?.canDeleteProviderOnboardings ?? false}
    />
  );
}
