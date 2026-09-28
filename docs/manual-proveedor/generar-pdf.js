/**
 * Genera el PDF del manual del proveedor imprimiendo la página
 * /manual-proveedor. La página es la única fuente: el PDF es una foto de ella.
 *
 * Uso (con la app corriendo):
 *   node docs/manual-proveedor/generar-pdf.js                 # contra localhost:3000
 *   node docs/manual-proveedor/generar-pdf.js https://www.jtplogistics.com
 *
 * Pide playwright (no es dependencia del proyecto). Instalado global, se
 * resuelve con NODE_PATH:
 *   npm i -g playwright
 *   NODE_PATH="$(npm root -g)" node docs/manual-proveedor/generar-pdf.js
 */
/* eslint-disable @typescript-eslint/no-require-imports -- script suelto de Node, fuera del bundle */
const path = require("path");
const { chromium } = require("playwright");

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const SALIDA = path.join(__dirname, "..", "Manual-del-proveedor-JTP-Logistics.pdf");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${BASE}/manual-proveedor`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: SALIDA,
    format: "A4",
    printBackground: true,
    // Los márgenes los pone el @page de la propia página.
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#55627a;padding:0 12mm;display:flex;justify-content:space-between;">
        <span>Manual del proveedor de transporte · JTP Logistics</span>
        <span class="pageNumber"></span>
      </div>`,
  });
  await browser.close();
  console.log("PDF generado en", SALIDA);
})();
