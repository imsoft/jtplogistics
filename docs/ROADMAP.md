# Roadmap — pendientes de producto y técnicos

Este documento lista el trabajo que **no se puede completar solo con código**: cada
item necesita cuentas externas, credenciales o decisiones de negocio. Sirve como
plan para priorizar. El esfuerzo es una estimación gruesa para una persona.

> Estado de la base actual (junio 2026): UX (skeletons de carga/error/404,
> sin dark mode), paginación server-side en Embarques/Clientes/Vendedores,
> auth devolviendo 401/403, lint + CI (typecheck/lint/test/build) y tests de
> lógica crítica con Vitest. Ver `git log`.

---

## 1. Tracking GPS en tiempo real 🚚 — *diferenciador #1*

Saber dónde está la carga ahora mismo.

- **Necesita (decisión/externo):**
  - Fuente de ubicación: app del operador (PWA/nativa que reporte GPS) **o**
    integración con telemetría/ELD del transportista (cada uno expone su API).
  - Proveedor de mapas: Google Maps Platform o Mapbox (cuenta + API key + costo
    por uso).
- **Enfoque técnico:** modelo `shipment_location` (lat, lng, timestamp, speed);
  endpoint para ingesta de posiciones; WebSocket/polling para el mapa en vivo;
  cálculo de ETA y geofencing (alertas al entrar/salir de origen/destino).
- **Esfuerzo:** alto (semanas). Empezar por reporte de posición desde la app del
  operador antes de integrar telemetría de terceros.

## 2. Portal de cliente / tracking público 🔗

Link tipo `jtplogistics.com/track/{folio}` sin login.

- **Necesita:** decidir qué datos se exponen al cliente final (estado, ETA,
  evidencia) y el formato del folio público.
- **Enfoque:** token público no adivinable por embarque; ruta pública de solo
  lectura; reutiliza el tracking del punto 1.
- **Esfuerzo:** medio. **Depende del punto 1** para mostrar ubicación/ETA.

## 3. Carta Porte 3.1 / CFDI 4.0 (facturación) 🧾 — *desbloquea mercado MX*

Obligatorio para transporte de mercancías en México.

- **Necesita (externo):**
  - Contratar un **PAC** (Facturama, SW Sapien, etc.): cuenta + credenciales.
  - **CSD** (Certificado de Sello Digital) del cliente y datos fiscales (RFC,
    régimen, código postal).
  - Catálogos del SAT (claves de producto/servicio, unidades, vías).
- **Enfoque:** modelo de factura + complemento Carta Porte; servicio que arma el
  XML y lo timbra vía el PAC; almacenamiento de XML/PDF; cancelaciones.
- **Esfuerzo:** alto. Es el item con más dependencias regulatorias; conviene
  hacerlo con asesoría fiscal.

## 4. WhatsApp Business API 💬

Hoy solo se guarda el número; falta enviar mensajes.

- **Necesita (externo):** cuenta de **WhatsApp Business API** (vía Meta o un BSP
  como Twilio/360dialog): número verificado, plantillas aprobadas, token.
- **Enfoque:** servicio de envío con plantillas (notificar embarque, cotización,
  recordatorios); webhook para respuestas; cola de envíos.
- **Esfuerzo:** medio.

## 5. Dashboard ejecutivo de rentabilidad 📊 — *no requiere externo*

Margen por ruta, ocupación de flota, rentabilidad por transportista/vendedor,
costo por km.

- **Necesita:** solo decisiones de qué KPIs priorizar (datos ya existen en
  `finances`, `routes`, `shipments`).
- **Enfoque:** queries de agregación + vistas con Recharts (ya está en el stack).
- **Esfuerzo:** medio. **Es el de mejor relación valor/esfuerzo y sin bloqueos
  externos** — buen siguiente paso.

---

## Pendientes técnicos (sin dependencias externas)

### A. Rediseño Finanzas ↔ Embarques

La tabla de Finanzas mezcla `shipments` + `finances` con un match heurístico
(`finance-shipment-match.ts`) y `sale`/`cost` ordenables que no viven
relacionalmente en el embarque. Por eso **no se migró a paginación server-side**.

- **Enfoque:** FK `finance.shipment_id` (o denormalizar `sale`/`cost` en
  `shipment`) + migración Prisma + backfill. Habilita paginación/orden
  server-side y simplifica el backfill actual del GET de shipments.
- **Esfuerzo:** medio.

### B. Migración a Server Components

~90 páginas son `"use client"` con fetch en `useEffect`. Con los skeletons
actuales la UX ya es buena; migrar a Server Components + streaming mejora la
carga percibida pero es página por página y hay que probar cada flujo.

- **Esfuerzo:** alto (incremental).

### C. Tablas acotadas (Colaboradores, Empleados, Laptops, Celulares, Correos)

Se quedan client-side **a propósito**: datasets pequeños + relaciones + filtros
derivados en cliente. Migrarlas aporta poco. Revisitar solo si crecen mucho.
