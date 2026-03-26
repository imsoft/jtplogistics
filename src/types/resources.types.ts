export interface EmployeeLinkedLaptop {
  id: string;
  name: string;
  serialNumber: string | null;
  emailAccount: { id: string; email: string } | null;
}

export interface EmployeeLinkedPhone {
  id: string;
  name: string;
  phoneNumber: string | null;
  emailAccount: { id: string; email: string } | null;
}

export interface EmployeeLinkedEmail {
  id: string;
  type: string;
  email: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  image: string | null;
  birthDate: string | null;
  position: string | null;
  department: string | null;
  phone: string | null;
  password: string | null;
  canViewMessages: boolean;
  canViewIdeas: boolean;
  canViewRoutes: boolean;
  canViewRouteLogs: boolean;
  canViewUnitTypes: boolean;
  canViewQuotes: boolean;
  canViewProviders: boolean;
  canViewClients: boolean;
  canViewEmployees: boolean;
  canViewVendors: boolean;
  canViewLaptops: boolean;
  canViewPhones: boolean;
  canViewEmails: boolean;
  canViewTasks: boolean;
  createdAt: string;
  laptops?: EmployeeLinkedLaptop[];
  phones?: EmployeeLinkedPhone[];
  emailAccounts?: EmployeeLinkedEmail[];
}

export interface EmployeeFormData {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  position: string;
  department: string;
  phone: string;
}

export interface Vendor {
  id: string;
  name: string;
  position: string | null;
  email: string;
  image: string | null;
  birthDate: string | null;
  createdAt: string;
}

export interface VendorFormData {
  name: string;
  position: string;
  email: string;
  password: string;
  birthDate: string;
}

export interface Laptop {
  id: string;
  name: string;
  password: string | null;
  serialNumber: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  emailAccountId: string | null;
  emailAccount: { id: string; email: string } | null;
  createdAt: string;
}

export interface LaptopFormData {
  name: string;
  password: string;
  serialNumber: string;
  assignedToId: string;
  emailAccountId: string;
}

export interface PhoneDevice {
  id: string;
  name: string;
  phoneNumber: string | null;
  password: string | null;
  imei: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  emailAccountId: string | null;
  emailAccount: { id: string; email: string } | null;
  createdAt: string;
}

export interface PhoneFormData {
  name: string;
  phoneNumber: string;
  password: string;
  imei: string;
  assignedToId: string;
  emailAccountId: string;
}

export interface EmailAccount {
  id: string;
  type: string;
  email: string;
  password: string | null;
  assignees: { id: string; name: string }[];
  createdAt: string;
}

export interface EmailFormData {
  type: string;
  email: string;
  password: string;
  assigneeIds: string[];
}
