"use client";

import { View, Text } from "@react-pdf/renderer";
import React from "react";
import { sentenceCaseSegments } from "@/lib/pdf-text-case";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Style = any;

const IS_BOLD = 1;
const IS_ITALIC = 2;
const IS_UNDERLINE = 8;

interface LexNode {
  type: string;
  format?: number;
  text?: string;
  tag?: string;
  listType?: string;
  value?: number;
  children?: LexNode[];
}

export interface LexPdfStyles {
  body: Style;
  bold: Style;
  italic: Style;
  heading: Style;
  bulletRow: Style;
  bulletDot: Style;
}

function renderInline(node: LexNode, styles: LexPdfStyles, key: number): React.ReactElement | null {
  if (node.type === "linebreak") return <Text key={key}>{"\n"}</Text>;
  if (node.type !== "text") return null;

  const fmt = node.format ?? 0;
  const base: Style = { ...styles.body };
  if (fmt & IS_BOLD) Object.assign(base, styles.bold);
  if (fmt & IS_ITALIC) Object.assign(base, styles.italic);
  if (fmt & IS_UNDERLINE) Object.assign(base, { textDecoration: "underline" } as Style);

  return <Text key={key} style={base}>{node.text}</Text>;
}

function renderBlock(node: LexNode, styles: LexPdfStyles, key: number): React.ReactElement | null {
  switch (node.type) {
    case "paragraph":
      return (
        // wrap={false} evita que el bloque se corte entre dos páginas.
        <Text key={key} wrap={false} style={{ ...styles.body, marginBottom: 5, lineHeight: 1.5 }}>
          {(node.children ?? []).map((c, i) => renderInline(c, styles, i))}
        </Text>
      );

    case "heading":
      return (
        <Text key={key} style={{ ...styles.body, ...styles.bold, ...styles.heading, marginBottom: 4, marginTop: 6 }}>
          {(node.children ?? []).map((c, i) => renderInline(c, styles, i))}
        </Text>
      );

    case "list": {
      const isBullet = node.listType !== "number";
      return (
        <View key={key} style={{ marginBottom: 6 }}>
          {(node.children ?? []).map((item, i) => (
            <View key={i} wrap={false} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>{isBullet ? "•" : `${item.value ?? i + 1}.`}</Text>
              <Text style={{ ...styles.body, flex: 1, lineHeight: 1.25 }}>
                {(item.children ?? []).map((c, j) => renderInline(c, styles, j))}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    default:
      return null;
  }
}

/**
 * Formato oración por bloque: el editor parte una misma frase en varios nodos
 * de texto cuando cambia el formato, así que la decisión se toma sobre el
 * bloque entero y luego se reparte a cada nodo.
 */
function caseInlineChildren(children: LexNode[] | undefined) {
  if (!children?.length) return;
  const parts = children.map((c) =>
    c.type === "text" ? c.text ?? "" : c.type === "linebreak" ? "\n" : ""
  );
  const cased = sentenceCaseSegments(parts);
  children.forEach((c, i) => {
    if (c.type === "text") c.text = cased[i];
  });
}

function applySentenceCase(root: LexNode) {
  for (const block of root.children ?? []) {
    if (block.type === "list") {
      for (const item of block.children ?? []) caseInlineChildren(item.children);
    } else {
      caseInlineChildren(block.children);
    }
  }
}

export function renderLexicalContent(
  jsonStr: string,
  styles: LexPdfStyles,
  /** sentenceCase: los textos capturados en mayúsculas salen en formato oración. */
  options: { sentenceCase?: boolean } = {}
): React.ReactElement {
  if (!jsonStr) return <View />;
  try {
    const state = JSON.parse(jsonStr) as { root: LexNode };
    // Se parsea en cada llamada, así que modificar el árbol no afecta a nadie más.
    if (options.sentenceCase) applySentenceCase(state.root);
    return (
      <View>
        {(state.root.children ?? []).map((child, i) => renderBlock(child, styles, i))}
      </View>
    );
  } catch {
    return <View />;
  }
}
