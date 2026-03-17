import { Suspense } from "react";
import { StaffMessagesView } from "@/components/dashboard/messages/staff-messages-view";

export default function CollaboratorMessagesPage() {
  return (
    <Suspense>
      <StaffMessagesView />
    </Suspense>
  );
}
