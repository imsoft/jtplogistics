# Manual del proveedor de transporte

**La fuente es la página [`/manual-proveedor`](../../src/app/manual-proveedor/page.tsx).**
Es pública (no pide sesión) para que el enlace se pueda mandar junto con los
accesos, antes de que el proveedor haya entrado nunca. Lo que se cambie ahí es
lo que ve el proveedor en cuanto se publica.

- **En pantalla** respeta la regla de la app: todo en MAYÚSCULAS.
- **Al imprimir** (botón "Imprimir o guardar PDF") sale en formato oración, igual
  que los PDF de cotización. Es `print:normal-case` en la raíz de la página.
- Las capturas viven en `public/images/manual-proveedor/`.
- El proveedor llega desde **Manual** en su menú, y la gente que da de alta
  recibe el enlace en su correo de invitación.

## Al cambiar el contenido

1. Editar `src/app/manual-proveedor/page.tsx`.
2. Subir la fecha de `UPDATED_AT` en ese mismo archivo: el proveedor la ve arriba.
3. Si cambió una pantalla, retomar su captura (ver abajo).
4. Regenerar el PDF de `docs/` para quien lo quiera adjuntar:

```bash
npm i -g playwright                                   # solo la primera vez
pnpm dev                                              # en otra terminal
NODE_PATH="$(npm root -g)" node docs/manual-proveedor/generar-pdf.js   # o pasar la URL de producción
```

## Retomar las capturas

Se tomaron con un transportista de prueba creado por el flujo real
(`/api/auth/sign-up/email` con `role: "carrier"`), con cuatro rutas de caja seca
cuyos targets se eligieron para que el semáforo saliera en verde, amarillo y
rojo. El usuario de prueba se borró de la base al terminar.

Viewport de 1360×900 a escala 2, y escondiendo el distintivo de desarrollo de
Next.js, que no existe en producción:

```css
nextjs-portal { display: none !important; }
```

## Qué NO dice el manual, a propósito

- **La fórmula del semáforo.** Los colores se explican en palabras (dentro del
  objetivo / ligeramente arriba / arriba), nunca el 5% de tolerancia ni el
  target de JTP. Es información interna.
- **Porcentajes.** El transportista no ve ninguno; el `%` de diferencia es de la
  vista interna de dirección.
