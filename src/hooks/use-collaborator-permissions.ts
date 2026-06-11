"use client";

import { useEffect, useState } from "react";

interface CollaboratorPermissions {
  canViewMessages: boolean;
  canCreateMessages: boolean;
  canUpdateMessages: boolean;
  canDeleteMessages: boolean;
  canViewIdeas: boolean;
  canCreateIdeas: boolean;
  canUpdateIdeas: boolean;
  canDeleteIdeas: boolean;
  canViewRoutes: boolean;
  canCreateRoutes: boolean;
  canUpdateRoutes: boolean;
  canDeleteRoutes: boolean;
  canViewRouteLogs: boolean;
  canCreateRouteLogs: boolean;
  canUpdateRouteLogs: boolean;
  canDeleteRouteLogs: boolean;
  canViewUnitTypes: boolean;
  canCreateUnitTypes: boolean;
  canUpdateUnitTypes: boolean;
  canDeleteUnitTypes: boolean;
  canViewQuotes: boolean;
  canCreateQuotes: boolean;
  canUpdateQuotes: boolean;
  canDeleteQuotes: boolean;
  canViewProviders: boolean;
  canCreateProviders: boolean;
  canUpdateProviders: boolean;
  canDeleteProviders: boolean;
  canViewClients: boolean;
  canCreateClients: boolean;
  canUpdateClients: boolean;
  canDeleteClients: boolean;
  canViewEmployees: boolean;
  canCreateEmployees: boolean;
  canUpdateEmployees: boolean;
  canDeleteEmployees: boolean;
  canViewVendors: boolean;
  canCreateVendors: boolean;
  canUpdateVendors: boolean;
  canDeleteVendors: boolean;
  canViewLaptops: boolean;
  canCreateLaptops: boolean;
  canUpdateLaptops: boolean;
  canDeleteLaptops: boolean;
  canViewPhones: boolean;
  canCreatePhones: boolean;
  canUpdatePhones: boolean;
  canDeletePhones: boolean;
  canViewEmails: boolean;
  canCreateEmails: boolean;
  canUpdateEmails: boolean;
  canDeleteEmails: boolean;
  canViewTasks: boolean;
  canCreateTasks: boolean;
  canUpdateTasks: boolean;
  canDeleteTasks: boolean;
  canViewShipments: boolean;
  canCreateShipments: boolean;
  canUpdateShipments: boolean;
  canDeleteShipments: boolean;
  canViewFinances: boolean;
  canCreateFinances: boolean;
  canUpdateFinances: boolean;
  canDeleteFinances: boolean;
  canViewMaritimeQuotes: boolean;
  canCreateMaritimeQuotes: boolean;
  canUpdateMaritimeQuotes: boolean;
  canDeleteMaritimeQuotes: boolean;
  canEditAcceptedQuotes: boolean;
}

export function useCollaboratorPermissions() {
  const [permissions, setPermissions] = useState<CollaboratorPermissions | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/collaborator/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CollaboratorPermissions | null) => {
        if (data) setPermissions(data);
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  return { permissions, isLoaded };
}
