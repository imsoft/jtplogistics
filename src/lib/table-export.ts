/**
 * Exportar una tabla tal como se ve: lee el HTML ya pintado (con sus filtros,
 * búsqueda y orden) y lo convierte en encabezados y filas de texto. Así cada
 * tabla exporta lo mismo que muestra sin que haya que describir sus columnas.
 *
 * - Las columnas sin encabezado (acciones: lápiz, basura…) no se exportan.
 * - Una celda con `data-export="…"` se exporta con ese texto en lugar del que
 *   muestra (p. ej. un expediente de íconos que se resume en palabras).
 * - Varias tablas dentro del mismo contenedor (rutas agrupadas por origen) se
 *   juntan en una sola, con los encabezados de la primera.
 */

export interface ExportData {
  headers: string[];
  rows: string[][];
}

const clean = (s: string) =>
  s
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim().replace(/^·\s*|\s*·$/g, ""))
    .filter((l) => l && l !== "·")
    .join(" · ")
    .replace(/( · )+/g, " · ");

/** Encabezado sin el texto solo para lectores de pantalla ("Acciones"), en mayúsculas como en pantalla. */
function headerText(el: Element): string {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(".sr-only").forEach((n) => n.remove());
  return clean(copy.textContent ?? "").toLocaleUpperCase("es-MX");
}

function cellText(el: Element): string {
  const forced = el.getAttribute("data-export");
  if (forced !== null) return forced;
  // innerText respeta los saltos entre bloques (nombre y subtítulo); los
  // íconos y botones sin texto no aportan nada.
  return clean((el as HTMLElement).innerText ?? el.textContent ?? "");
}

export function tableFromDom(root: HTMLElement | null): ExportData {
  if (!root) return { headers: [], rows: [] };
  const tables = [...root.querySelectorAll("table")].filter((t) => !t.closest("[data-export-ignore]"));
  if (tables.length === 0) return { headers: [], rows: [] };

  const headCells = [...(tables[0].tHead?.rows[tables[0].tHead.rows.length - 1]?.cells ?? [])];
  const keep = headCells.map((th) => headerText(th) !== "");
  const headers = headCells.map(headerText).filter((_, i) => keep[i]);

  const rows: string[][] = [];
  for (const t of tables) {
    for (const body of t.tBodies) {
      for (const tr of body.rows) {
        // Filas de "no hay resultados" o de detalle que ocupan todo el ancho.
        if (tr.cells.length !== headCells.length) continue;
        rows.push([...tr.cells].map(cellText).filter((_, i) => keep[i]));
      }
    }
  }
  return { headers, rows };
}

/** Nombre de archivo a partir del título: "Tabla de embarques" → tabla-de-embarques-2026-10-28. */
export function exportFileBase(title: string, now = new Date()): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `${slug || "tabla"}-${d}`;
}
