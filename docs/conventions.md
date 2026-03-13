# Convenciones de Base de Datos y Datos

Este documento define las reglas que **deben aplicarse de forma consistente** en todo el proyecto (migraciones, modelos Prisma, queries, seeds, endpoints API, validaciones y documentación).

---

## 1. Base de datos (PostgreSQL)

### 1.1 Nombres de tablas y columnas

- **SIEMPRE** usar `snake_case` y **minúsculas**.
- **NO** usar PascalCase, camelCase ni mayúsculas en nombres de tablas o columnas.

**Ejemplos correctos:**

| Tipo     | Ejemplo |
|----------|---------|
| Tablas   | `users`, `real_estate_agencies`, `properties` |
| Columnas | `first_name`, `created_at`, `owner_id`, `updated_at` |

**En Prisma:** usar `@@map("nombre_tabla")` y `@map("nombre_columna")` para mapear modelos/campos en camelCase a tablas/columnas en snake_case en la BD. La URL de conexión (`DATABASE_URL`) se configura en `prisma.config.ts`, no en el schema (Prisma 7).

### 1.2 Roles de usuario

- Los roles se guardan **en inglés** en la BD: `admin`, `carrier`, `collaborator`, `vendor` (enum `UserRole` en Prisma).
- Código y variables en inglés; las etiquetas visibles (Administrador, Transportista, Colaborador) se pueden localizar en el frontend.

### 1.3 Inconsistencias existentes

Si se detecta alguna tabla o columna que no cumpla esta regla, se debe proponer una migración para renombrar y normalizar.

---

## 2. Contenido de datos (valores guardados)

### 2.1 Emails

- Guardar **SIEMPRE** en minúsculas.
- Antes de persistir: `email = email.trim().toLowerCase()`.
- Usar el helper: `normalizeEmail(email)`.

### 2.2 Usernames / handles

- Guardar **SIEMPRE** en minúsculas y **sin espacios**.
- Normalización: `trim()` + `toLowerCase()`.
- Deben ser **únicos** (constraint en BD y validación en backend).
- Usar el helper: `normalizeUsername(username)`.

### 2.3 Slugs (URLs)

- **SIEMPRE** en minúsculas, con guiones, sin acentos ni caracteres especiales.
- Usar el helper: `slugify(text)`.

### 2.4 Nombres visibles

- Campos como `first_name`, `last_name`, `company_name`, etc.:
  - **NO** forzar a minúsculas.
  - Guardar “normalizado”: `trim()` y colapsar espacios múltiples.
  - La capitalización para presentación (ej. título o nombre propio) se hace en **frontend**, no en la BD, salvo que el cliente indique lo contrario.

---

## 3. API y frontend

- **Base de datos:** `snake_case`.
- **Código JS/TS:** `camelCase`.
- Al leer/escribir con la BD, mapear de forma consistente:
  - Ejemplo: `created_at` (BD) ↔ `createdAt` (código).
- Prisma ya maneja este mapeo cuando se usa `@map` / `@@map` en el schema.

---

## 4. Validaciones y constraints

### 4.1 Backend

- **Email:** unicidad case-insensitive; formato válido; longitud razonable.
- **Username:** unicidad case-insensitive; longitud mínima/máxima; solo caracteres permitidos (ej. alfanuméricos, guión bajo).

### 4.2 Base de datos

- Índices únicos para `email` y `username` (considerar índices que ignoren mayúsculas si el motor lo permite, o guardar ya normalizado).
- Longitud máxima en columnas para `username`, `slug`, `email` según reglas de negocio.

### 4.3 Slugs

- Longitud mínima/máxima definida.
- Solo caracteres permitidos: letras minúsculas, números, guiones.

---

## 5. Helpers reutilizables

Ubicación: `src/lib/normalize.ts` (o equivalente).

| Función             | Uso |
|---------------------|-----|
| `normalizeEmail(s)` | `trim` + `toLowerCase` para emails. |
| `normalizeUsername(s)` | `trim` + `toLowerCase`; opcionalmente eliminar espacios internos. |
| `slugify(s)`        | Minúsculas, reemplazar espacios y caracteres no permitidos por guiones, sin acentos. |

---

## 6. Revisiones antes de cambios

Antes de crear o modificar:

- Migraciones
- Modelos Prisma
- Endpoints que lean/escriban datos

se debe verificar que se cumplan estas convenciones. Si se detectan inconsistencias, reportarlas y corregirlas.
