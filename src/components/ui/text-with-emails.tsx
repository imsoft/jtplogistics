const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/**
 * Muestra un texto tal cual, salvo los correos que trae dentro: esos van en
 * minúsculas aunque el resto de la interfaz esté en mayúsculas. Sirve para
 * nombres que en realidad son un correo y para frases como
 * «A pricing@jtp.com.mx cuando…».
 */
export function TextWithEmails({ text }: { text: string }) {
  const parts = text.split(EMAIL);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-email">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}
