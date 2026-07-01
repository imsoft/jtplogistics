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
  hireDate: string | null;
  position: string | null;
  department: string | null;
  phone: string | null;
  nss: string | null;
  rfc: string | null;
  curp: string | null;
  address: string | null;
  /** Indica si hay nota de contraseña guardada (el valor nunca se expone por API). */
  hasPasswordReference?: boolean;
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
  canCreateRecords: boolean;
  canReadRecords: boolean;
  canUpdateRecords: boolean;
  canDeleteRecords: boolean;
  createdAt: string;
  laptops?: EmployeeLinkedLaptop[];
  phones?: EmployeeLinkedPhone[];
  emailAccounts?: EmployeeLinkedEmail[];
}

export interface EmployeeFormData {
  name: string;
  email: string;
  /** En alta es obligatoria vía UI; en edición omitir si no se cambia la nota guardada. */
  password?: string;
  birthDate: string;
  hireDate: string;
  position: string;
  department: string;
  phone: string;
  nss: string;
  rfc: string;
  curp: string;
  address: string;
}

export interface Vendor {
  id: string;
  name: string;
  position: string | null;
  email: string;
  image: string | null;
  birthDate: string | null;
  vendorNotes: string | null;
  emailAccounts: { id: string; type: string; email: string }[];
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
  equipmentCode: string | null;
  password: string | null;
  serialNumber: string | null;
  equipmentType: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  accessories: string | null;
  generalState: string | null;
  software: string | null;
  observations: string | null;
  maintenanceProvider: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  emailAccountId: string | null;
  emailAccount: { id: string; email: string } | null;
  createdAt: string;
}

export interface LaptopFormData {
  name: string;
  equipmentCode: string;
  password: string;
  serialNumber: string;
  equipmentType: string;
  brand: string;
  model: string;
  color: string;
  accessories: string;
  generalState: string;
  software: string;
  observations: string;
  maintenanceProvider: string;
  imageUrl: string;
  imagePublicId: string;
  assignedToId: string;
  emailAccountId: string;
}

export interface PhoneDevice {
  id: string;
  name: string;
  equipmentCode: string | null;
  phoneNumber: string | null;
  password: string | null;
  imei: string | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  observations: string | null;
  maintenanceProvider: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  department: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  emailAccountId: string | null;
  emailAccount: { id: string; email: string } | null;
  createdAt: string;
}

export interface PhoneFormData {
  name: string;
  equipmentCode: string;
  phoneNumber: string;
  password: string;
  imei: string;
  serialNumber: string;
  brand: string;
  model: string;
  color: string;
  observations: string;
  maintenanceProvider: string;
  imageUrl: string;
  imagePublicId: string;
  assignedToId: string;
  emailAccountId: string;
}

export interface EmailAccount {
  id: string;
  type: string;
  email: string;
  password: string | null;
  department: string | null;
  assignees: { id: string; name: string }[];
  createdAt: string;
}

export interface EmailFormData {
  type: string;
  email: string;
  password: string;
  assigneeIds: string[];
}
