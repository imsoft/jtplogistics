/**
 * Genera la firma electrónica de cada colaborador de JTP en `firmas/`.
 *
 * Salen dos cosas:
 *   - `firmas/<correo>.html`: solo la firma, para abrirla, copiar y pegar.
 *   - `firmas/index.html`: todas juntas, cada una con su botón de copiar y las
 *     instrucciones para Outlook y Gmail. Es el archivo que se reparte.
 *
 * Se excluyen transportistas (son proveedores, no personal) y developers.
 *
 * Uso: pnpm run signatures
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "../src/lib/db";
import { buildSignature } from "../src/lib/signature";
import { titleCase } from "../src/lib/utils";
import { BRAND } from "../src/lib/email-layout";

/** El logo tiene que venir de una URL pública: en el correo no hay archivos locales. */
const LOGO_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.jtplogistics.com").replace(/\/$/, "") +
  "/images/logo/jtp-logistics.png";

const OUT_DIR = "firmas";

function slug(email: string): string {
  return email.split("@")[0].replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
}

/** Página suelta con una sola firma, para quien prefiera copiarla de ahí. */
function singlePage(name: string, signature: string): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Firma · ${name}</title></head>
<body style="margin:0;padding:32px;background:#ffffff;">
${signature}
</body>
</html>`;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "collaborator", "vendor"] } },
    select: {
      name: true,
      email: true,
      position: true,
      whatsappPhone: true,
      employeeProfile: { select: { position: true, department: true, phone: true } },
    },
    orderBy: { name: "asc" },
  });

  mkdirSync(OUT_DIR, { recursive: true });

  const cards: string[] = [];
  const incomplete: string[] = [];

  for (const user of users) {
    const position = user.employeeProfile?.position ?? user.position ?? null;
    const phone = user.employeeProfile?.phone ?? user.whatsappPhone ?? null;
    const name = titleCase(user.name);

    if (!position || !phone) {
      incomplete.push(`${name} (${[!position && "sin puesto", !phone && "sin teléfono"].filter(Boolean).join(", ")})`);
    }

    const signature = buildSignature(
      {
        name: user.name,
        email: user.email,
        position,
        department: user.employeeProfile?.department ?? null,
        phone,
      },
      { logoUrl: LOGO_URL }
    );

    writeFileSync(`${OUT_DIR}/${slug(user.email)}.html`, singlePage(name, signature));

    cards.push(`<section class="card">
  <header>
    <h2>${name}</h2>
    <button type="button" onclick="copySignature(this)">Copiar firma</button>
  </header>
  <div class="preview">${signature}</div>
</section>`);
  }

  writeFileSync(`${OUT_DIR}/index.html`, indexPage(cards.join("\n")));

  console.log(`✓ ${users.length} firmas en ${OUT_DIR}/`);
  console.log(`  Repartir: ${OUT_DIR}/index.html`);
  if (incomplete.length > 0) {
    console.log("\nDatos que faltan en la plataforma (la firma sale igual, sin ese dato):");
    for (const line of incomplete) console.log(`  · ${line}`);
  }
}

function indexPage(cards: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Firmas electrónicas · JTP Logistics</title>
<style>
  body { margin:0; padding:32px 20px 64px; background:${BRAND.background};
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
         color:${BRAND.text}; }
  .wrap { max-width:760px; margin:0 auto; }
  h1 { margin:0 0 4px; font-size:20px; text-transform:uppercase; letter-spacing:.04em; color:${BRAND.blue}; }
  .lead { margin:0 0 24px; font-size:14px; color:${BRAND.muted}; }
  .how { background:#fff; border:1px solid ${BRAND.border}; border-radius:10px; padding:16px 20px; margin-bottom:28px; }
  .how h3 { margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:${BRAND.muted}; }
  .how ol { margin:0; padding-left:20px; font-size:13px; line-height:1.7; }
  .card { background:#fff; border:1px solid ${BRAND.border}; border-radius:10px; margin-bottom:20px; overflow:hidden; }
  .card header { display:flex; align-items:center; justify-content:space-between; gap:12px;
                 padding:12px 20px; border-bottom:1px solid ${BRAND.border}; background:${BRAND.surface}; }
  .card h2 { margin:0; font-size:14px; font-weight:700; }
  .card button { background:${BRAND.blue}; color:${BRAND.onBlue}; border:0; border-radius:8px;
                 padding:8px 16px; font-size:11px; font-weight:700; letter-spacing:.06em;
                 text-transform:uppercase; cursor:pointer; }
  .card button:hover { background:${BRAND.blueDark}; }
  .preview { padding:24px 20px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Firmas electrónicas</h1>
  <p class="lead">Una por colaborador, con los datos que hay en la plataforma.</p>

  <div class="how">
    <h3>Cómo ponerla</h3>
    <ol>
      <li>Pulsa <strong>Copiar firma</strong> en la tarjeta que te toque.</li>
      <li><strong>Outlook:</strong> Archivo → Opciones → Correo → Firmas → Nueva, y pega con <strong>Ctrl+V</strong> (Cmd+V en Mac).</li>
      <li><strong>Gmail:</strong> Configuración → Ver toda la configuración → Firma → Crear, y pega ahí mismo.</li>
      <li>Guarda. Manda un correo de prueba para confirmar que el logo se ve.</li>
    </ol>
  </div>

${cards}
</div>

<script>
  // Se copia la selección con formato: el portapapeles conserva el HTML y
  // Outlook lo pega tal cual. navigator.clipboard no sirve abriendo el archivo
  // desde el disco, porque file:// no es un contexto seguro.
  function copySignature(button) {
    var preview = button.closest('.card').querySelector('.preview');
    var range = document.createRange();
    range.selectNodeContents(preview);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    var ok = document.execCommand('copy');
    selection.removeAllRanges();
    var original = button.textContent;
    button.textContent = ok ? 'Copiada' : 'Copia manual';
    setTimeout(function () { button.textContent = original; }, 1800);
  }
</script>
</body>
</html>`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
