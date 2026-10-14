import { useMemo, useState, type ReactNode } from "react";
import { Platform, StyleSheet, Text, TextInput, View, type TextStyle } from "react-native";

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
        accessibilityLabel="Spoiler, tap to show"
        style={[styles.spoiler, { backgroundColor: palette.text, color: palette.background }]}
      >
        spoiler
      </Text>
    );
  }
  return <Text selectable>{children}</Text>;
}

type Block =
  | { kind: "plain"; color: "text" | "quote"; text: string }
  | { kind: "gap"; lines: number }
  | { kind: "rich"; segments: Segment[] }
  | { kind: "spoiler"; segments: Segment[] };

function lineMode(line: Segment[]): "text" | "quote" | "rich" | "blank" {
  if (line.length === 0) return "blank";
  let quote = false;
  let plain = false;
  for (const segment of line) {
    if (segment.type !== "text") return "rich";
    const style = segment.style;
    if (style.spoiler || style.bold || style.italic || style.mono || style.underline) return "rich";
    if (style.quote) quote = true;
    else if (segment.text.length > 0) plain = true;
  }
  if (quote && plain) return "rich";
  if (quote) return "quote";
  return "text";
}

function lineText(line: Segment[]): string {
  let text = "";
  for (const segment of line) {
    if (segment.type !== "break") text += segment.text;
  }
  return text;
}

/** Les lignes sans lien ni style restent un champ sélectionnable. Le reste garde les appuis. */
function plainBlocks(segments: Segment[]): Block[] {
  const lines: Segment[][] = [[]];
  for (const segment of segments) {
    if (segment.type === "break") lines.push([]);
    else lines[lines.length - 1].push(segment);
  }

  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const mode = lineMode(lines[index]);
    if (mode === "rich") {
      blocks.push({ kind: "rich", segments: lines[index] });
      index += 1;
      continue;
    }

    const parts: string[] = [];
    let color: "text" | "quote" | null = mode === "blank" ? null : mode;
    while (index < lines.length) {
      const next = lineMode(lines[index]);
      if (next === "rich") break;
      if (next === "blank") {
        parts.push("");
        index += 1;
        continue;
      }
      if (color == null) color = next;
      if (next !== color) break;
      parts.push(lineText(lines[index]));
      index += 1;
    }

    if (color == null) blocks.push({ kind: "gap", lines: Math.max(1, parts.length - 1) });
    else blocks.push({ kind: "plain", color, text: parts.join("\n") });
  }
  return blocks;
}

function blocksFrom(segments: Segment[]): Block[] {
  const blocks: Block[] = [];
  let index = 0;
  while (index < segments.length) {
    const segment = segments[index];
    if (segment.type === "break" || !segment.style.spoiler) {
      const start = index;
      while (index < segments.length) {
        const next = segments[index];
        if (next.type !== "break" && next.style.spoiler) break;
        index += 1;
      }
      blocks.push(...plainBlocks(segments.slice(start, index)));
      continue;
    }

    const start = index;
    while (index < segments.length) {
      const next = segments[index];
      if (next.type === "break") {
        const after = segments[index + 1];
        if (!after || after.type === "break" || !after.style.spoiler) break;
        index += 1;
        continue;
      }
      if (!next.style.spoiler) break;
      index += 1;
    }
    blocks.push({ kind: "spoiler", segments: segments.slice(start, index) });
  }
  return blocks;
}

function PlainBlock({ text, color }: { text: string; color: string }) {
  const lines = Math.max(text.split("\n").length, Math.ceil(text.length / 32));
  const estimate = Math.max(21, lines * 21);
  const ceiling = Math.max(120, text.length * 3);
  const [height, setHeight] = useState(estimate);
  return (
    <TextInput
      editable={false}
      readOnly
      multiline
      scrollEnabled={false}
      caretHidden
      selectTextOnFocus={false}
      autoCorrect={false}
      spellCheck={false}
      rejectResponderTermination={false}
      value={text}
      onContentSizeChange={(event) => {
        const next = event.nativeEvent.contentSize.height;
        if (next > height + 1 && next < ceiling) setHeight(next);
      }}
      style={[styles.plain, { color, height }]}
    />
  );
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
  const blocks = useMemo(() => blocksFrom(segments), [segments]);

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

  if (!html || blocks.length === 0) return null;

  return (
    <View>
      {blocks.map((block, index) => {
        if (block.kind === "gap") return <View key={index} style={{ height: 21 * block.lines }} />;
        if (block.kind === "plain") {
          if (!block.text) return null;
          const color = block.color === "quote" ? palette.quote : palette.text;
          return <PlainBlock key={index} text={block.text} color={color} />;
        }
        const rich = (
          <Text selectable style={[styles.body, { color: palette.text }]}>
            {block.segments.map((segment, segmentIndex) => renderSegment(segment, segmentIndex))}
          </Text>
        );
        if (block.kind === "spoiler") return <SpoilerSpan key={index}>{rich}</SpoilerSpan>;
        return <View key={index}>{rich}</View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 21 },
  plain: {
    fontSize: 15,
    lineHeight: 21,
    padding: 0,
    margin: 0,
    borderWidth: 0,
  },
  spoiler: { borderRadius: 2, overflow: "hidden" },
});
