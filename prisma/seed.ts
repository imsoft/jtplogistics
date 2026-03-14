/**
 * Seed script — datos de prueba para JTP Logistics.
 * Ejecutar: pnpm db:seed
 */

import "dotenv/config";
import { auth } from "../src/lib/auth";
import prisma from "../src/lib/db";

async function createUser(
  name: string,
  email: string,
  password: string,
  role: "admin" | "carrier" | "collaborator"
) {
  await prisma.user.deleteMany({ where: { email } });

  const res = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  if (!res?.user?.id) {
    throw new Error(`No se pudo crear el usuario ${email}`);
  }

  await prisma.user.update({
    where: { id: res.user.id },
    data: { role },
  });

  return res.user.id;
}

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ── Usuarios ──────────────────────────────────────────────────────────────

  const adminId = await createUser("Administrador JTP", "admin@jtplogistics.com", "Admin123!", "admin");
  console.log("✅ Admin creado:", adminId);

  const carrier1Id = await createUser("Carlos Mendoza", "carlos@transportesmexico.com", "Carrier123!", "carrier");
  console.log("✅ Carrier 1 creado:", carrier1Id);

  const carrier2Id = await createUser("María Torres", "maria@fletesnorte.com", "Carrier123!", "carrier");
  console.log("✅ Carrier 2 creado:", carrier2Id);

  const carrier3Id = await createUser("Roberto Juárez", "roberto@logisticasur.com", "Carrier123!", "carrier");
  console.log("✅ Carrier 3 creado:", carrier3Id);

  const demoCarrierId = await createUser("Demo Transportista", "demo@jtp.com.mx", "Demo2026", "carrier");
  console.log("✅ Cuenta demo transportista creada:", demoCarrierId);

  const collabId  = await createUser("Ana García",      "ana@jtplogistics.com",     "Collab123!", "collaborator");
  const collab2Id = await createUser("Luis Ramírez",    "luis@jtplogistics.com",    "Collab123!", "collaborator");
  const collab3Id = await createUser("Sofía Herrera",   "sofia@jtplogistics.com",   "Collab123!", "collaborator");
  const collab4Id = await createUser("Diego Morales",   "diego@jtplogistics.com",   "Collab123!", "collaborator");
  console.log("✅ Collaborators creados:", collabId, collab2Id, collab3Id, collab4Id);

  // ── Fechas de nacimiento ───────────────────────────────────────────────────

  await prisma.user.update({ where: { id: collabId },  data: { birthDate: new Date("1992-03-15") } });
  await prisma.user.update({ where: { id: collab2Id }, data: { birthDate: new Date("1989-07-22") } });
  await prisma.user.update({ where: { id: collab3Id }, data: { birthDate: new Date("1995-11-08") } });
  await prisma.user.update({ where: { id: collab4Id }, data: { birthDate: new Date("1998-04-30") } });
  console.log("✅ Fechas de nacimiento asignadas");

  // ── Perfiles de carriers (uno a uno para obtener el id y luego crear contactos) ───

  await prisma.profile.deleteMany({
    where: { userId: { in: [carrier1Id, carrier2Id, carrier3Id] } },
  });

  const profile1 = await prisma.profile.create({
    data: {
      userId: carrier1Id,
      commercialName: "Transportes México",
      legalName: "Transportes México S.A. de C.V.",
      rfc: "TME901201ABC",
      address: "Av. Tecnológico 1250, Chihuahua, Chihuahua",
    },
  });

  const profile2 = await prisma.profile.create({
    data: {
      userId: carrier2Id,
      commercialName: "Fletes del Norte",
      legalName: "Fletes del Norte S. de R.L.",
      rfc: "FNO850615XYZ",
      address: "Blvd. Díaz Ordaz 340, Monterrey, Nuevo León",
    },
  });

  const profile3 = await prisma.profile.create({
    data: {
      userId: carrier3Id,
      commercialName: "Logística Sur",
      legalName: "Logística Sur de México S.A.",
      rfc: "LSM780320DEF",
      address: "Calzada Independencia 890, Guadalajara, Jalisco",
    },
  });

  // ── Contactos ─────────────────────────────────────────────────────────────

  await prisma.contact.createMany({
    data: [
      // Carlos
      { profileId: profile1.id, type: "phone", value: "+52 614 123 4567", label: "Oficina" },
      { profileId: profile1.id, type: "phone", value: "+52 614 987 6543", label: "Celular" },
      { profileId: profile1.id, type: "email", value: "carlos@transportesmexico.com", label: "Principal" },
      { profileId: profile1.id, type: "email", value: "operaciones@transportesmexico.com", label: "Operaciones" },
      // María
      { profileId: profile2.id, type: "phone", value: "+52 81 9876 5432", label: "Oficina" },
      { profileId: profile2.id, type: "email", value: "maria@fletesnorte.com", label: "Principal" },
      { profileId: profile2.id, type: "email", value: "cotizaciones@fletesnorte.com", label: "Cotizaciones" },
      // Roberto
      { profileId: profile3.id, type: "phone", value: "+52 33 4567 8901", label: "Oficina" },
      { profileId: profile3.id, type: "phone", value: "+52 33 1122 3344", label: "Celular" },
      { profileId: profile3.id, type: "email", value: "roberto@logisticasur.com", label: "Principal" },
    ],
  });
  console.log("✅ Perfiles y contactos creados");

  // ── Rutas ─────────────────────────────────────────────────────────────────

  await prisma.carrierRoute.deleteMany({});
  await prisma.route.deleteMany({});

  await prisma.route.createMany({
    data: [
      { origin: "Ciudad de México", destination: "Monterrey",       description: "Ruta principal CDMX–Regio vía autopista 57D",               target: 12000.0, unitType: "dry_box", status: "active"   },
      { origin: "Guadalajara",      destination: "Tijuana",          description: "Ruta costera por autopista 15D con escala en Culiacán",     target: 18500.0, unitType: "dry_box", status: "active"   },
      { origin: "Puebla",           destination: "Veracruz",         description: "Corredor industrial Puebla–Puerto de Veracruz",             target: 6800.0,  unitType: "dry_box", status: "active"   },
      { origin: "Monterrey",        destination: "Ciudad Juárez",    description: "Ruta frontera norte hacia El Paso, TX",                    target: 9500.0,  unitType: "dry_box", status: "active"   },
      { origin: "León",             destination: "Mérida",           description: "Ruta peninsular en revisión de tarifas",                   target: 22000.0, unitType: "dry_box", status: "pending"  },
      { origin: "Saltillo",         destination: "Mazatlán",         description: "Pendiente de asignación de transportista",                 target: 14000.0, unitType: "dry_box", status: "pending"  },
      { origin: "Querétaro",        destination: "Cancún",           description: "Ruta turística–industrial en negociación",                 target: 28000.0, unitType: "dry_box", status: "pending"  },
      { origin: "Chihuahua",        destination: "Hermosillo",       description: "Suspendida por cierre temporal de autopista 2",            target: 8200.0,  unitType: "dry_box", status: "inactive" },
      { origin: "Acapulco",         destination: "Ciudad de México",  description: "Ruta costera pausada por temporada de lluvias",           target: 7500.0,  unitType: "dry_box", status: "inactive" },
      { origin: "Tampico",          destination: "Villahermosa",     description: "Ruta del golfo inactiva por mantenimiento",                target: 9100.0,  unitType: "dry_box", status: "inactive" },
    ],
  });
  console.log("✅ 10 rutas creadas");

  // ── Selecciones de rutas por carrier ──────────────────────────────────────

  const activeRoutes = await prisma.route.findMany({
    where: { status: "active" },
    select: { id: true, origin: true, destination: true, target: true },
  });

  type RouteRef = { id: string; origin: string; destination: string; target: number | null };
  const routeMap = new Map<string, RouteRef>(
    activeRoutes.map((r: RouteRef) => [`${r.origin}→${r.destination}`, r])
  );

  const cdmxMty   = routeMap.get("Ciudad de México→Monterrey")!;
  const gdlTij    = routeMap.get("Guadalajara→Tijuana")!;
  const pueblaVer = routeMap.get("Puebla→Veracruz")!;
  const mtyJuarez = routeMap.get("Monterrey→Ciudad Juárez")!;

  await prisma.carrierRoute.createMany({
    data: [
      { carrierId: carrier1Id, routeId: cdmxMty.id,   carrierTarget: 11500.0 },
      { carrierId: carrier1Id, routeId: gdlTij.id,    carrierTarget: 19200.0 },
      { carrierId: carrier1Id, routeId: mtyJuarez.id, carrierTarget: 9000.0  },
      { carrierId: carrier2Id, routeId: cdmxMty.id,   carrierTarget: 12500.0 },
      { carrierId: carrier2Id, routeId: pueblaVer.id, carrierTarget: 6200.0  },
      { carrierId: carrier3Id, routeId: cdmxMty.id,   carrierTarget: 11000.0 },
      { carrierId: carrier3Id, routeId: gdlTij.id,    carrierTarget: 17800.0 },
      { carrierId: carrier3Id, routeId: pueblaVer.id, carrierTarget: 7100.0  },
      { carrierId: carrier3Id, routeId: mtyJuarez.id, carrierTarget: 9500.0  },
    ],
  });
  console.log("✅ Selecciones de rutas creadas");

  // ── EmployeeProfiles ──────────────────────────────────────────────────────

  await prisma.employeeProfile.deleteMany({
    where: { userId: { in: [collabId, collab2Id, collab3Id, collab4Id] } },
  });

  await prisma.employeeProfile.createMany({
    data: [
      { userId: collabId,  position: "Coordinadora de Operaciones", department: "Operaciones",    phone: "+52 55 1234 5678", password: "Ana2024!" },
      { userId: collab2Id, position: "Analista de Logística",        department: "Logística",      phone: "+52 55 2345 6789", password: "Luis2024!" },
      { userId: collab3Id, position: "Ejecutiva de Ventas",          department: "Ventas",         phone: "+52 55 3456 7890", password: "Sofia2024!" },
      { userId: collab4Id, position: "Soporte Técnico",              department: "TI",             phone: "+52 55 4567 8901", password: "Diego2024!" },
    ],
  });
  console.log("✅ EmployeeProfiles creados");

  // ── EmailAccounts ─────────────────────────────────────────────────────────

  await prisma.emailAccountUser.deleteMany({});
  await prisma.emailAccount.deleteMany({});

  const emailOps = await prisma.emailAccount.create({
    data: { type: "Gmail",   email: "operaciones@jtplogistics.com", password: "Ops@JTP2024"  },
  });
  const emailVentas = await prisma.emailAccount.create({
    data: { type: "Outlook", email: "ventas@jtplogistics.com",      password: "Ventas@2024"  },
  });
  const emailSoporte = await prisma.emailAccount.create({
    data: { type: "Gmail",   email: "soporte@jtplogistics.com",     password: "Sop@Tech24"   },
  });

  await prisma.emailAccountUser.createMany({
    data: [
      { emailAccountId: emailOps.id,     userId: collabId   },
      { emailAccountId: emailOps.id,     userId: collab2Id  },
      { emailAccountId: emailVentas.id,  userId: collab3Id  },
      { emailAccountId: emailSoporte.id, userId: collab4Id  },
      { emailAccountId: emailSoporte.id, userId: collab2Id  },
    ],
  });
  console.log("✅ EmailAccounts creados");

  // ── Laptops ───────────────────────────────────────────────────────────────

  await prisma.laptop.deleteMany({});

  await prisma.laptop.createMany({
    data: [
      { name: "MacBook Pro 14\"",    serialNumber: "C02XG2JHJGH5", password: "mbp-jtp-2024", assignedToId: collabId,  emailAccountId: emailOps.id     },
      { name: "Dell XPS 15",         serialNumber: "DL7K9P3",      password: "dell-luis-01", assignedToId: collab2Id, emailAccountId: emailOps.id     },
      { name: "Lenovo ThinkPad E15", serialNumber: "LN2024T001",   password: "tp-sofia-99",  assignedToId: collab3Id, emailAccountId: emailVentas.id  },
      { name: "HP EliteBook 840",    serialNumber: "HP840-0042",   password: null,           assignedToId: null,      emailAccountId: null            },
    ],
  });
  console.log("✅ Laptops creados");

  // ── Phones ────────────────────────────────────────────────────────────────

  await prisma.phone.deleteMany({});

  await prisma.phone.createMany({
    data: [
      { name: "iPhone 14",           phoneNumber: "+52 55 1111 2222", imei: "356938035643809", password: "0000", assignedToId: collabId,  emailAccountId: emailOps.id     },
      { name: "Samsung Galaxy S23",  phoneNumber: "+52 55 3333 4444", imei: "490154203237518", password: "1234", assignedToId: collab2Id, emailAccountId: emailOps.id     },
      { name: "iPhone 13 mini",      phoneNumber: "+52 55 5555 6666", imei: "014532543490997", password: "9876", assignedToId: collab4Id, emailAccountId: emailSoporte.id },
      { name: "Motorola Edge 40",    phoneNumber: null,               imei: null,             password: null,   assignedToId: null,      emailAccountId: null            },
    ],
  });
  console.log("✅ Phones creados");

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed completado

Usuarios:
  admin@jtplogistics.com        / Admin123!
  demo@jtp.com.mx               / Demo2026 (cuenta genérica transportistas)
  carlos@transportesmexico.com  / Carrier123!
  maria@fletesnorte.com         / Carrier123!
  roberto@logisticasur.com      / Carrier123!
  ana@jtplogistics.com          / Collab123!
  luis@jtplogistics.com         / Collab123!
  sofia@jtplogistics.com        / Collab123!
  diego@jtplogistics.com        / Collab123!

Rutas: 4 activas · 3 pendientes · 3 inactivas
Selecciones: Carlos (3) · María (2) · Roberto (4)
Empleados: 4 · Laptops: 4 · Celulares: 4 · Cuentas de correo: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
