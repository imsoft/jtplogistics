import type { UserRole } from "./roles";

export type { UserRole };

export interface UserContact {
  id: string;
  type: "phone" | "email";
  value: string;
  label: string | null;
}

export interface UserProfile {
  commercialName: string | null;
  legalName: string | null;
  rfc: string | null;
  address: string | null;
  contacts: UserContact[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  profile: UserProfile | null;
}
