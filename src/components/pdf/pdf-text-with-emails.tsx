import { StyleSheet, Text } from "@react-pdf/renderer";

type Style = ReturnType<typeof StyleSheet.create>[string];

/**
 * Los PDF van en MAYÚSCULAS (cada página lleva `textTransform: "uppercase"`,
 * que react-pdf hereda a todo su texto), salvo los correos: esos se dejan en
 * minúsculas, como en la plataforma.
 */
export const PDF_UPPERCASE: Style = { textTransform: "uppercase" };
const PDF_EMAIL: Style = { textTransform: "lowercase" };

const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** Un correo suelto, en minúsculas. */
export function PdfEmail({ children, style }: { children: string; style?: Style }) {
  return <Text style={style ? [style, PDF_EMAIL] : PDF_EMAIL}>{children}</Text>;
}

/**
 * Un texto que puede traer correos dentro (celdas de tabla, términos): el
 * texto sigue la página y cada correo va en minúsculas. Se usa dentro de un
 * `<Text>`; los pedazos son `<Text>` anidados, como pide react-pdf.
 */
export function PdfTextWithEmails({ text }: { text: string }) {
  const parts = text.split(EMAIL);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={PDF_EMAIL}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </>
  );
}
