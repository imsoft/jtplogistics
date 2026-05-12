"use client";

import { View, Text } from "@react-pdf/renderer";
import React from "react";

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
        <Text key={key} style={{ ...styles.body, marginBottom: 5, lineHeight: 1.5 }}>
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
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>{isBullet ? "•" : `${item.value ?? i + 1}.`}</Text>
              <Text style={{ ...styles.body, flex: 1, lineHeight: 1.4 }}>
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

export function renderLexicalContent(jsonStr: string, styles: LexPdfStyles): React.ReactElement {
  if (!jsonStr) return <View />;
  try {
    const state = JSON.parse(jsonStr) as { root: LexNode };
    return (
      <View>
        {(state.root.children ?? []).map((child, i) => renderBlock(child, styles, i))}
      </View>
    );
  } catch {
    return <View />;
  }
}
