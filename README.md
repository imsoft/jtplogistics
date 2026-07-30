# JTP Logistics

Aplicación web para la gestión de rutas, flotas, cotizaciones, finanzas y equipo de una operación logística. Incluye dashboards por rol (administrador, transportista, colaborador, vendedor, desarrollador), autenticación con Better Auth, permisos granulares por módulo y base de datos PostgreSQL.

**Dominio:** [www.jtplogistics.com](https://www.jtplogistics.com) (el dominio sin `www` redirige aquí)

---

## Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, React 19, React Compiler)
- **Base de datos:** [PostgreSQL](https://www.postgresql.org) sobre [Neon](https://neon.tech) con [Prisma 7](https://www.prisma.io) (adapter serverless)
- **Autenticación:** [Better Auth](https://www.better-auth.com) (email/contraseña, sesiones, restablecimiento de contraseña)
- **UI:** [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), [Radix UI](https://www.radix-ui.com), [Base UI](https://base-ui.com), [Lucide](https://lucide.dev)
- **Tablas de datos:** [TanStack Table](https://tanstack.com/table) (DataTable con filtros y ordenación)
- **Editor de texto enriquecido:** [Lexical](https://lexical.dev) (términos de cotización y blog del mural)
- **Fechas:** [react-day-picker](https://daypicker.dev) vía el `Calendar` de shadcn
- **Documentos y datos:** [@react-pdf/renderer](https://react-pdf.org) (cotizaciones), [SheetJS](https://sheetjs.com) (exportar a Excel), [Recharts](https://recharts.org) (gráficas)
- **Otros:** [Cloudinary](https://cloudinary.com) (imágenes), [Resend](https://resend.com) (correos), [Vitest](https://vitest.dev) (pruebas), [Vercel Analytics / Speed Insights](https://vercel.com/docs/analytics)

---

## Roles y permisos

Los roles se guardan en inglés en la BD: `admin`, `carrier`, `collaborator`, `vendor`, `developer`.

El **administrador** tiene acceso total. El **colaborador** no ve nada por defecto: el admin le enciende permisos módulo por módulo desde *Colaboradores → editar*, con cuatro niveles por módulo (`leer`, `crear`, `editar`, `eliminar`). Esos permisos viven como columnas booleanas en `users` (`can_view_*`, `can_create_*`, `can_update_*`, `can_delete_*`) y se aplican en dos capas:

- **Páginas:** `requireCollaboratorPermission()` en el `layout.tsx` del módulo (redirige si no tiene permiso).
- **API:** un *gate* por módulo (p. ej. `gateTasks`, `gateMural`) que responde `403`.

El admin siempre pasa ambas capas sin necesidad de tener los flags encendidos.

---

## Funcionalidades por rol

### Administrador

- **Operaciones:** Rutas (CRUD, origen/destino, tarifa objetivo, estado), Tipos de unidad, Tipos de incidencia, Embarques, Tabla de finanzas y Rentabilidad por ruta.
- **Reglas operativas:** los registros de finanzas se generan automáticamente cuando un embarque se cierra.
- **Comercial:** Cotizador (terrestre y marítimo), Proveedores (transportistas con perfil, rutas asignadas y rating), Clientes.
- **Equipo:** Colaboradores (perfil y permisos), Vendedores, Organigrama, **Mural**.
- **Activos:** Laptops, Celulares, Cuentas de correo (asignación a usuarios y dispositivos).
- **Otros:** Ideas, Tareas, Sugerencias de transportistas, Usuarios, Historial de cambios (auditoría), Cuenta demo, Configuración.

### Colaborador

Los mismos módulos que el admin, pero **limitados a los permisos que el admin le encienda**: rutas, cotizador, cotización marítima, tipos de unidad, mensajes, embarques, finanzas, clientes, proveedores, vendedores, colaboradores, laptops, celulares, correos, ideas, tareas, historial y mural.

### Transportista (carrier)

- Dashboard, perfil (datos comerciales, RFC, contactos), rutas asignadas, metas por ruta, sugerencias y mensajes.

### Vendedor

- Dashboard, perfil, cotizaciones asignadas y colaboradores a su cargo.

### Desarrollador

- Dashboard, perfil y tareas.

---

## Mural (RH)

Tablero interno visible solo para el personal de JTP (admin y colaboradores con `canViewMural`). Transportistas y vendedores quedan fuera.

- **Agenda a 60 días:** cumpleaños, aniversarios, vacaciones, eventos y capacitaciones.
- **Cumpleaños y aniversarios no se capturan a mano:** se derivan de `users.birth_date` y `employee_profiles.hire_date`. Si esas fechas están vacías, la persona no aparece.
- **Blog:** noticias con texto enriquecido (Lexical), portada y estado borrador/publicado.
- **Avisos:** al publicar se crea la notificación en el dashboard de cada persona y se manda un correo con la identidad de JTP. Quien publica puede apagar el envío de correo.
- **Felicitación personal:** el día de su cumpleaños o aniversario, la persona ve confeti y un mensaje al entrar al dashboard, con un botón para repetirlo. Si no es su día, el botón ni aparece.
- **Resumen diario:** un cron de Vercel (`vercel.json`) dispara `/api/cron/mural-digest` todos los días a las 14:00 UTC (8:00 en CDMX) con las novedades del día. Protegido con `CRON_SECRET`.

Para que RH administre el mural, el admin le enciende los cuatro permisos de *Mural*; al resto del equipo le basta con *leer*.

---

## Estructura del proyecto

```
jtplogistics/
├── prisma/
│   ├── schema.prisma    # Modelos (users, routes, shipments, mural_*, etc.)
│   ├── seed.ts          # Datos de prueba (usuarios, rutas, activos)
│   └── migrations/      # SQL versionado (se escribe a mano, ver más abajo)
├── src/
│   ├── app/
│   │   ├── (auth)/            # login, register, forgot-password, reset-password
│   │   ├── admin/dashboard/
│   │   ├── carrier/dashboard/
│   │   ├── collaborator/dashboard/
│   │   ├── vendor/dashboard/
│   │   ├── developer/dashboard/
│   │   └── api/               # auth, admin, collaborator, carrier, vendor, mural, cron
│   ├── components/
│   │   ├── ui/                # shadcn + componentes base (DataTable, DatePicker, Lexical)
│   │   └── dashboard/         # componentes por módulo
│   ├── hooks/
│   ├── lib/                   # auth, db, validators, utils, config, data, correos
│   └── types/
├── public/
├── docs/
│   └── conventions.md   # Convenciones de BD y datos
├── instrumentation.ts   # Normalización de BETTER_AUTH_URL al arranque
├── vercel.json          # Cron del resumen diario del mural
└── next.config.ts
```

La interfaz y los textos visibles están en **español**; el código (rutas, variables, comentarios) en **inglés**.

---

## Requisitos

- [Node.js](https://nodejs.org) 22+ (es la versión que usa CI)
- [pnpm](https://pnpm.io) — el proyecto **no** usa npm ni yarn
- PostgreSQL (local o [Neon](https://neon.tech))

---

## Variables de entorno

Crear `.env` en la raíz (no se commitea). Ejemplo:

```env
# Base de datos
DATABASE_URL="postgresql://..."

# Better Auth (en producción usar el dominio final CON www)
BETTER_AUTH_SECRET="..."   # mínimo 32 caracteres (openssl rand -base64 32)
BETTER_AUTH_URL="http://localhost:3000"

# Opcional: orígenes adicionales (CSRF)
# BETTER_AUTH_TRUSTED_ORIGINS=https://www.jtplogistics.com

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Resend. Sin RESEND_API_KEY los correos solo se imprimen en consola (útil en dev).
RESEND_API_KEY="..."
EMAIL_FROM="JTP Logistics <noreply@jtplogistics.com>"

# URL pública usada en los enlaces y el logo de los correos.
# Sin ella los correos salen sin logo ni botón (no se rompen, usan un respaldo).
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Secreto del cron del resumen diario del mural. Vercel lo manda como
# "Authorization: Bearer <valor>". Si está vacío, el endpoint no exige credencial
# (cómodo en local, nunca en producción).
CRON_SECRET=""
```

Notas:

- En Vercel, `VERCEL_URL` se rellena automáticamente y se usa para `trustedOrigins` si hace falta.
- `NEXT_PUBLIC_APP_URL` se incrusta en el bundle **durante el build**: al cambiarla hay que redesplegar para que surta efecto.

---

## Cómo arrancar

```bash
# Instalar dependencias (también corre prisma generate)
pnpm install

# Aplicar migraciones
pnpm db:migrate:deploy

# (Opcional) Poblar datos de prueba
pnpm db:seed

# (Opcional) Sembrar configuración de portada/branding
pnpm db:seed-settings

# (Opcional) Crear cuenta demo transportista
pnpm db:create-demo-carrier

# Desarrollo
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000). Para entrar con datos de prueba, ver el mensaje al final de `pnpm db:seed` (correos y contraseñas por rol).

---

## Migraciones

> **`pnpm db:migrate` (`prisma migrate dev`) está roto en este proyecto:** falla al crear la *shadow database* en Neon.

El flujo que sí funciona:

1. Editar `prisma/schema.prisma`.
2. Crear a mano `prisma/migrations/<AAAAMMDDHHMMSS>_<nombre>/migration.sql` con el SQL correspondiente.
3. Aplicarla con `pnpm db:migrate:deploy`.
4. Regenerar el cliente con `pnpm db:generate`.

Ojo: `db:migrate:deploy` aplica contra la base de datos de `DATABASE_URL`, que es la **BD real compartida**. Revisar el SQL antes de correrlo.

---

## Scripts

| Comando | Descripción |
|--------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm test` | Pruebas con Vitest |
| `pnpm test:watch` | Pruebas en modo watch |
| `pnpm db:generate` | Generar Prisma Client |
| `pnpm db:migrate` | Migraciones en desarrollo (**roto**, ver arriba) |
| `pnpm db:migrate:deploy` | Aplicar migraciones |
| `pnpm db:seed` | Ejecutar seed |
| `pnpm db:seed-settings` | Seed de ajustes/configuración |
| `pnpm db:create-demo-carrier` | Crear cuenta demo transportista |
| `pnpm db:assign-route-creator` | Asignar creador a rutas existentes |
| `pnpm db:sync-route-destination-states` | Sincronizar estados destino de rutas |
| `pnpm db:studio` | Abrir Prisma Studio |

---

## Pruebas

`pnpm test` corre Vitest sobre la lógica pura (sin BD ni red): coincidencia de embarques y finanzas, búsqueda, fechas de cumpleaños y aniversarios, y armado de los correos de felicitación.

Los módulos con lógica que valga la pena probar se separan de los que tocan Prisma —por ejemplo `mural-celebrations.ts` (puro) frente a `mural-celebrations-query.ts` (BD)— porque importar `@/lib/db` en una prueba falla si no hay `DATABASE_URL`.

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) corre en cada push y PR: typecheck, lint, test y build.

---

## Notas de operación

- **Finanzas:** no se recomienda el alta manual; el flujo principal es generar los registros al cerrar embarques.
- **Seed:** inserta los tipos de incidencia sin duplicar (`skipDuplicates`), pero reinicia otras entidades de prueba.
- **Correos:** todos los envíos (mural, felicitaciones, alertas de ruta, auth) salen por Resend con el remitente de `EMAIL_FROM`.

---

## Despliegue (Vercel)

1. Conectar el repositorio a [Vercel](https://vercel.com).
2. Configurar las variables de entorno, incluyendo `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (con la URL final, `https://www.jtplogistics.com`) y `CRON_SECRET`.
3. Desplegar. El build usa `pnpm build`; si `BETTER_AUTH_URL` no trae protocolo, se normaliza a `https://` al arrancar.
4. El cron de `vercel.json` queda registrado solo, sin configuración extra en el panel.

---

## Convenciones

Reglas de base de datos, nombres y validaciones: [docs/conventions.md](docs/conventions.md).

En resumen: tablas y columnas en `snake_case`, código en `camelCase`, correos y slugs normalizados a minúsculas, y los roles guardados en inglés.

---

## Licencia

Proyecto privado.
