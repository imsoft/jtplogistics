# JTP Logistics

Aplicación web para la gestión de rutas, flotas, cotizaciones y equipo de una operación logística. Incluye dashboards por rol (administrador, transportista, colaborador, vendedor), autenticación con Better Auth y base de datos PostgreSQL.

**Dominio:** [jtplogistics.com](https://jtplogistics.com)

---

## Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, React 19)
- **Base de datos:** [PostgreSQL](https://www.postgresql.org) con [Prisma](https://www.prisma.io)
- **Autenticación:** [Better Auth](https://www.better-auth.com) (email/contraseña, sesiones, restablecimiento de contraseña)
- **UI:** [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com), [Lucide](https://lucide.dev)
- **Tablas de datos:** [TanStack Table](https://tanstack.com/table) (DataTable con filtros y ordenación)
- **Otros:** [Cloudinary](https://cloudinary.com) (imágenes), [Resend](https://resend.com) (emails), [Vercel Analytics / Speed Insights](https://vercel.com/docs/analytics)

---

## Funcionalidades por rol

### Administrador

- **Operaciones:** Rutas (CRUD, origen/destino, tarifa objetivo, estado), Tipos de unidad, Tipos de incidencia, Embarques y tabla de finanzas.
- **Reglas operativas:** los registros de finanzas se generan automáticamente cuando un embarque se cierra.
- **Comercial:** Cotizador (cotizaciones de transportistas y vendedores), Proveedores (transportistas con perfil y rutas asignadas), Clientes.
- **Equipo:** Colaboradores (empleados con perfil y permisos), Vendedores (gestión y cotizaciones).
- **Activos:** Laptops, Celulares, Cuentas de correo (asignación a usuarios y dispositivos).
- **Otros:** Ideas (propuestas del equipo), Usuarios (roles, metas, WhatsApp), Perfil, Configuración.

### Transportista (carrier)

- Dashboard, perfil (datos comerciales, RFC, contactos), rutas asignadas y metas por ruta.

### Colaborador

- Dashboard, perfil, ideas (listado y alta de ideas).

### Vendedor

- Dashboard, perfil, cotizaciones (carrier quotes asignadas).

---

## Estructura del proyecto

```
jtplogistics/
├── prisma/
│   ├── schema.prisma    # Modelos (users, routes, profiles, laptops, etc.)
│   ├── seed.ts          # Datos de prueba (usuarios, rutas, activos)
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/       # login, register, forgot-password, reset-password
│   │   ├── admin/dashboard/   # Rutas del admin
│   │   ├── carrier/dashboard/
│   │   ├── collaborator/dashboard/
│   │   ├── vendor/dashboard/
│   │   └── api/          # API routes (auth, admin, carrier, vendor, etc.)
│   ├── components/       # UI (shadcn + componentes de dashboard)
│   ├── hooks/
│   ├── lib/              # auth, db, validators, utils, config, data
│   └── types/
├── public/
├── docs/
│   └── conventions.md   # Convenciones de BD y datos
├── instrumentation.ts   # Normalización de BETTER_AUTH_URL al arranque
└── next.config.ts
```

La interfaz y textos visibles están en **español**; el código (rutas, variables, comentarios) en **inglés**.

---

## Requisitos

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io)
- PostgreSQL (local o [Neon](https://neon.tech), etc.)

---

## Variables de entorno

Crear `.env` en la raíz (no commitear). Ejemplo:

```env
# Base de datos
DATABASE_URL="postgresql://..."

# Better Auth (producción: usar https://jtplogistics.com o jtplogistics.com)
BETTER_AUTH_SECRET="..."   # mínimo 32 caracteres (openssl rand -base64 32)
BETTER_AUTH_URL="http://localhost:3000"

# Opcional: orígenes adicionales (CSRF)
# BETTER_AUTH_TRUSTED_ORIGINS=https://www.jtplogistics.com

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Resend (emails)
RESEND_API_KEY="..."
EMAIL_FROM="JTP Logistics <noreply@jtplogistics.com>"
```

En Vercel, `VERCEL_URL` se rellena automáticamente y se usa para `trustedOrigins` si hace falta.

---

## Cómo arrancar

```bash
# Instalar dependencias
pnpm install

# Generar cliente Prisma
pnpm db:generate

# Aplicar migraciones
pnpm db:migrate

# (Opcional) Poblar datos de prueba
pnpm db:seed

# (Opcional) Sembrar configuración de portada/branding
pnpm db:seed-settings

# (Opcional) Crear cuenta demo transportista
pnpm db:create-demo-carrier

# Desarrollo
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000). Para probar con datos de prueba, ver el mensaje al final de `pnpm db:seed` (correos y contraseñas por rol).

---

## Scripts

| Comando | Descripción |
|--------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm db:generate` | Generar Prisma Client |
| `pnpm db:migrate` | Migraciones en desarrollo |
| `pnpm db:migrate:deploy` | Migraciones en producción |
| `pnpm db:seed` | Ejecutar seed |
| `pnpm db:seed-settings` | Seed de ajustes/configuración |
| `pnpm db:create-demo-carrier` | Crear cuenta demo transportista |
| `pnpm db:assign-route-creator` | Asignar creador a rutas existentes |
| `pnpm db:sync-route-destination-states` | Sincronizar estados destino de rutas |
| `pnpm db:studio` | Abrir Prisma Studio |

---

## Notas de operación

- **Finanzas:** no se recomienda alta manual; el flujo principal es generar registros al cerrar embarques.
- **Seed:** incluye ejemplos de tipos de incidencia con inserción no destructiva (`skipDuplicates`), pero el script también reinicia otras entidades de prueba.

---

## Despliegue (Vercel)

1. Conectar el repositorio a [Vercel](https://vercel.com).
2. Configurar las variables de entorno (incluyendo `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` con la URL final, p. ej. `https://jtplogistics.com`).
3. Desplegar. El build usa `pnpm build`; si `BETTER_AUTH_URL` no tiene protocolo, se normaliza a `https://` en tiempo de arranque.

---

## Convenciones

Reglas de base de datos, nombres y validaciones: [docs/conventions.md](docs/conventions.md).

---

## Licencia

Proyecto privado.
