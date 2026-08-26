/**
 * Lectura de la ficha de un colaborador, compartida por los paneles que la
 * muestran: dirección (admin) y soporte de TI (developer).
 *
 * Las contraseñas nunca salen de aquí: solo se informa si hay una guardada
 * (`hasPassword`). Para verla hay que pasar por /api/credentials, que la
 * registra en la bitácora.
 */

import { prisma } from "@/lib/db";
import { hasSecret } from "@/lib/secret-vault";

export const PERMISSION_MODULES = [
  { suffix: "Messages", label: "Mensajes" },
  { suffix: "Ideas", label: "Ideas" },
  { suffix: "Routes", label: "Rutas" },
  { suffix: "RouteLogs", label: "Historial de cambios" },
  { suffix: "UnitTypes", label: "Tipos de unidades" },
  { suffix: "Quotes", label: "Cotizador" },
  { suffix: "Providers", label: "Proveedores" },
  { suffix: "Clients", label: "Clientes" },
  { suffix: "Employees", label: "Colaboradores" },
  { suffix: "Vendors", label: "Vendedores" },
  { suffix: "Laptops", label: "Laptops" },
  { suffix: "Phones", label: "Celulares" },
  { suffix: "Emails", label: "Correos" },
  { suffix: "Tasks", label: "Tareas" },
  { suffix: "Shipments", label: "Embarques" },
  { suffix: "Finances", label: "Finanzas" },
  { suffix: "MaritimeQuotes", label: "Cotización marítima" },
  { suffix: "Mural", label: "Mural" },
] as const;

export const PERMISSION_FIELDS = [
  ...PERMISSION_MODULES.flatMap((module) => [
    `canView${module.suffix}`,
    `canCreate${module.suffix}`,
    `canUpdate${module.suffix}`,
    `canDelete${module.suffix}`,
  ]),
  "canEditAcceptedQuotes",
  // Permisos sueltos de solo lectura, sin el juego completo de CRUD.
  "canViewMaintenance",
  "canViewEmailDemos",
];

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries([
  ...PERMISSION_MODULES.flatMap((module) => [
    [`canView${module.suffix}`, `${module.label}: leer`],
    [`canCreate${module.suffix}`, `${module.label}: crear`],
    [`canUpdate${module.suffix}`, `${module.label}: editar`],
    [`canDelete${module.suffix}`, `${module.label}: eliminar`],
  ]),
  ["canEditAcceptedQuotes", "Cotizaciones aceptadas: editar y eliminar"],
  ["canViewMaintenance", "Mantenimientos: leer"],
  ["canViewEmailDemos", "Correos de prueba: usar"],
]);

/** Todo lo que cuelga de un colaborador: equipo asignado y cuentas de correo. */
export const EMPLOYEE_DETAIL_INCLUDE = {
  employeeProfile: true,
  assignedLaptops: {
    include: { emailAccount: { select: { id: true, email: true } } },
  },
  assignedPhones: {
    include: { emailAccount: { select: { id: true, email: true } } },
  },
  assignedEmails: {
    include: { emailAccount: { select: { id: true, type: true, email: true, password: true } } },
  },
} as const;

type EmployeeDetail = NonNullable<
  Awaited<ReturnType<typeof loadEmployeeDetail>>
>;

export function loadEmployeeDetail(id: string) {
  return prisma.user.findUnique({ where: { id }, include: EMPLOYEE_DETAIL_INCLUDE });
}

/** El renglón de la lista: solo los datos del perfil. */
export function serializeEmployeeRow(u: {
  id: string;
  name: string;
  email: string;
  image: string | null;
  birthDate: Date | null;
  createdAt: Date;
  employeeProfile: {
    hireDate: Date | null;
    position: string | null;
    department: string | null;
    phone: string | null;
    nss: string | null;
    rfc: string | null;
    curp: string | null;
    address: string | null;
    password: string | null;
  } | null;
}) {
  const p = u.employeeProfile;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    birthDate: u.birthDate ? u.birthDate.toISOString().split("T")[0] : null,
    hireDate: p?.hireDate ? p.hireDate.toISOString().split("T")[0] : null,
    position: p?.position ?? null,
    department: p?.department ?? null,
    phone: p?.phone ?? null,
    nss: p?.nss ?? null,
    rfc: p?.rfc ?? null,
    curp: p?.curp ?? null,
    address: p?.address ?? null,
    hasPasswordReference: Boolean(p?.password?.trim()),
    createdAt: u.createdAt.toISOString(),
  };
}

/** La ficha completa: perfil, permisos y equipo asignado. */
export function serializeEmployeeDetail(u: EmployeeDetail) {
  const permissionValues = Object.fromEntries(
    PERMISSION_FIELDS.map((field) => [field, u[field as keyof typeof u]])
  );

  return {
    ...serializeEmployeeRow(u),
    ...permissionValues,
    laptops: u.assignedLaptops.map((l) => ({
      id: l.id,
      name: l.name,
      equipmentCode: l.equipmentCode,
      equipmentType: l.equipmentType,
      brand: l.brand,
      model: l.model,
      color: l.color,
      serialNumber: l.serialNumber,
      hasPassword: hasSecret(l.password),
      accessories: l.accessories,
      generalState: l.generalState,
      software: l.software,
      observations: l.observations,
      maintenanceProvider: l.maintenanceProvider,
      imageUrl: l.imageUrl,
      emailAccount: l.emailAccount ? { id: l.emailAccount.id, email: l.emailAccount.email } : null,
    })),
    phones: u.assignedPhones.map((p) => ({
      id: p.id,
      name: p.name,
      equipmentCode: p.equipmentCode,
      phoneNumber: p.phoneNumber,
      imei: p.imei,
      serialNumber: p.serialNumber,
      brand: p.brand,
      model: p.model,
      color: p.color,
      hasPassword: hasSecret(p.password),
      observations: p.observations,
      maintenanceProvider: p.maintenanceProvider,
      imageUrl: p.imageUrl,
      emailAccount: p.emailAccount ? { id: p.emailAccount.id, email: p.emailAccount.email } : null,
    })),
    emailAccounts: u.assignedEmails.map((ea) => ({
      id: ea.emailAccount.id,
      type: ea.emailAccount.type,
      email: ea.emailAccount.email,
      hasPassword: hasSecret(ea.emailAccount.password),
    })),
  };
}
