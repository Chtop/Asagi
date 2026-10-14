import { useMemo, useState, type ReactNode } from "react";
import { Platform, StyleSheet, Text, type TextStyle } from "react-native";

import { classifyHref, parseComment, type QuoteTarget, type Segment, type TextStyleFlags } from "@/src/lib/html";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Palette } from "@/src/theme/palette";

function textStyle(style: TextStyleFlags, palette: Palette, dead: boolean): TextStyle {
  return {
    color: dead ? palette.textMuted : style.quote ? palette.quote : palette.text,
    fontWeight: style.bold ? "700" : "400",
    fontStyle: style.italic ? "italic" : "normal",
    textDecorationLine: style.underline ? "underline" : "none",
    fontFamily: style.mono ? (Platform.OS === "ios" ? "Menlo" : "monospace") : undefined,
    backgroundColor: style.mono ? palette.surfaceAlt : undefined,
  };
}

function SpoilerSpan({ children }: { children: ReactNode }) {
  const { palette } = useAppTheme();
  const [shown, setShown] = useState(false);
  if (!shown) {
    return (
      <Text
        onPress={() => setShown(true)}
        suppressHighlighting
        accessibilityRole="button"
        accessibilityLabel="Spoiler, appuyer pour afficher"
        style={[styles.spoiler, { backgroundColor: palette.text, color: palette.background }]}
      >
        spoiler
      </Text>
    );
  }
  return <Text>{children}</Text>;
}

export function CommentBody({
  html,
  onQuote,
}: {
  html?: string;
  onQuote: (target: QuoteTarget) => void;
}) {
  const { palette } = useAppTheme();
  const segments = useMemo(() => (html ? parseComment(html) : []), [html]);

  const nodes = useMemo(() => {
    const rendered: ReactNode[] = [];

    const renderSegment = (segment: Segment, key: number) => {
      if (segment.type === "break") return "\n";
      if (segment.type === "link") {
        const target = segment.dead ? null : classifyHref(segment.href);
        return (
          <Text
            key={key}
            onPress={target ? () => onQuote(target) : undefined}
            style={[textStyle(segment.style, palette, segment.dead), target ? { color: palette.quoteLink } : null]}
          >
            {segment.text}
          </Text>
        );
      }
      return (
        <Text key={key} style={textStyle(segment.style, palette, segment.dead)}>
          {segment.text}
        </Text>
      );
    };

    let index = 0;
    while (index < segments.length) {
      const segment = segments[index];
      if (segment.type === "break" || !segment.style.spoiler) {
        rendered.push(renderSegment(segment, index));
        index += 1;
        continue;
      }

      const start = index;
      const inner: ReactNode[] = [];
      while (index < segments.length) {
        const next = segments[index];
        if (next.type === "break") {
          const after = segments[index + 1];
          if (!after || after.type === "break" || !after.style.spoiler) break;
          inner.push("\n");
          index += 1;
          continue;
        }
        if (!next.style.spoiler) break;
        inner.push(renderSegment(next, index));
        index += 1;
      }
      rendered.push(<SpoilerSpan key={`spoiler-${start}`}>{inner}</SpoilerSpan>);
    }

    return rendered;
  }, [onQuote, palette, segments]);

  if (!html || nodes.length === 0) return null;

  return (
    <Text selectable style={[styles.body, { color: palette.text }]}>
      {nodes}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 21 },
  spoiler: { borderRadius: 2, overflow: "hidden" },
});
