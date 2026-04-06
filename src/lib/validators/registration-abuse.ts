/**
 * Heurísticas para rechazar registros con nombres tipo cadena aleatoria
 * y correos con parte local anormal (muchos segmentos muy cortos).
 * No sustituyen CAPTCHA ni verificación de correo; reducen ruido obvio.
 */

const VOWELS = new Set("aeiouáéíóúüAEIOUÁÉÍÓÚÜ");

export type RegistrationAbuseResult = { ok: true } | { ok: false; message: string };

function letterVowelRatio(text: string): number {
  const letters = text.replace(/\P{L}/gu, "");
  if (letters.length === 0) return 1;
  let vowels = 0;
  for (const ch of letters) {
    if (VOWELS.has(ch)) vowels += 1;
  }
  return vowels / letters.length;
}

function maxConsonantRun(text: string): number {
  const norm = text.normalize("NFC");
  let max = 0;
  let run = 0;
  for (const ch of norm) {
    if (!/\p{L}/u.test(ch)) {
      run = 0;
      continue;
    }
    if (VOWELS.has(ch)) run = 0;
    else {
      run += 1;
      max = Math.max(max, run);
    }
  }
  return max;
}

function isAllUppercaseLettersOrDigitsNoSpaces(text: string): boolean {
  const core = text.replace(/\s+/g, "");
  return core.length > 0 && /^[A-ZÁÉÍÓÚÜÑ0-9]+$/u.test(core);
}

/**
 * Valida razón social, nombre comercial o nombre de contacto.
 */
export function validateRegistrationDisplayName(
  value: string,
  fieldLabel: string
): RegistrationAbuseResult {
  const s = value.trim().replace(/\s+/g, " ");
  if (s.length < 2) {
    return { ok: false, message: `${fieldLabel} es demasiado corto.` };
  }
  if (s.length > 200) {
    return { ok: false, message: `${fieldLabel} es demasiado largo.` };
  }
  if (!/\p{L}/u.test(s)) {
    return { ok: false, message: `${fieldLabel} debe incluir letras.` };
  }

  const lettersOnly = s.replace(/\P{L}/gu, "");
  const ratio = letterVowelRatio(s);

  if (!s.includes(" ") && lettersOnly.length >= 14 && ratio < 0.22) {
    return {
      ok: false,
      message: `${fieldLabel} no tiene un formato de nombre o razón social válido.`,
    };
  }

  if (lettersOnly.length >= 16 && ratio < 0.18) {
    return {
      ok: false,
      message: `${fieldLabel} no tiene un formato de nombre o razón social válido.`,
    };
  }

  if (maxConsonantRun(s) >= 7) {
    return {
      ok: false,
      message: `${fieldLabel} no tiene un formato de nombre o razón social válido.`,
    };
  }

  if (!s.includes(" ") && s.length >= 18 && isAllUppercaseLettersOrDigitsNoSpaces(s) && ratio < 0.28) {
    return {
      ok: false,
      message: `${fieldLabel} no tiene un formato de nombre o razón social válido.`,
    };
  }

  return { ok: true };
}

/**
 * Parte local del correo: rechaza patrones tipo "a.b.c.d.e@..." usados en abuso.
 */
export function validateRegistrationEmail(email: string): RegistrationAbuseResult {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0 || at === e.length - 1) {
    return { ok: false, message: "El correo electrónico no es válido." };
  }
  const local = e.slice(0, at);
  if (!local.length || local.length > 64) {
    return { ok: false, message: "El correo electrónico no es válido." };
  }

  const segments = local.split(".");
  const shortSegments = segments.filter((seg) => seg.length <= 2).length;
  if (shortSegments >= 4) {
    return {
      ok: false,
      message:
        "Usa un correo con un formato habitual (evita muchos puntos con segmentos muy cortos).",
    };
  }
  if (segments.length >= 10) {
    return {
      ok: false,
      message: "El formato del correo electrónico no está permitido.",
    };
  }
  const oneCharSegments = segments.filter((seg) => seg.length === 1).length;
  if (oneCharSegments >= 3) {
    return {
      ok: false,
      message:
        "Usa un correo con un formato habitual (evita muchos puntos con segmentos muy cortos).",
    };
  }

  return { ok: true };
}

export function validateSignUpEmailPayload(input: {
  name: string;
  email: string;
}): RegistrationAbuseResult {
  const name = validateRegistrationDisplayName(input.name.trim(), "El nombre");
  if (!name.ok) return name;
  return validateRegistrationEmail(input.email);
}

export function validateCarrierProfilePayload(input: {
  name?: string;
  commercialName?: string | null;
  legalName?: string | null;
  contacts?: { type: string; value: string }[];
}): RegistrationAbuseResult {
  if (input.name != null && input.name.trim()) {
    const n = validateRegistrationDisplayName(input.name.trim(), "El nombre");
    if (!n.ok) return n;
  }
  if (input.commercialName != null && String(input.commercialName).trim()) {
    const c = validateRegistrationDisplayName(
      String(input.commercialName).trim(),
      "El nombre comercial"
    );
    if (!c.ok) return c;
  }
  if (input.legalName != null && String(input.legalName).trim()) {
    const l = validateRegistrationDisplayName(
      String(input.legalName).trim(),
      "La razón social"
    );
    if (!l.ok) return l;
  }
  if (Array.isArray(input.contacts)) {
    for (const c of input.contacts) {
      if (c.type === "email" && c.value?.trim()) {
        const e = validateRegistrationEmail(c.value.trim());
        if (!e.ok) return e;
      }
    }
  }
  return { ok: true };
}
