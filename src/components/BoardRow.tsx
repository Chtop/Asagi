import { Pressable, StyleSheet, Text, View } from "react-native";

import { SafetyBadge } from "@/src/components/ui";
import { htmlToPlain } from "@/src/lib/html";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Board } from "@/src/types/fourchan";

export function BoardRow({ board, onPress }: { board: Board; onPress: () => void }) {
  const { palette } = useAppTheme();
  const description = board.meta_description ? htmlToPlain(board.meta_description) : "";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? palette.surfaceAlt : palette.background, borderBottomColor: palette.border },
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.code, { color: palette.text }]}>/{board.board}/</Text>
        <SafetyBadge worksafe={board.ws_board === 1} />
      </View>
      <Text style={[styles.title, { color: palette.text }]}>{htmlToPlain(board.title)}</Text>
      {description ? (
        <Text numberOfLines={2} style={[styles.description, { color: palette.textMuted }]}>
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  code: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  title: { fontSize: 15 },
  description: { fontSize: 13, lineHeight: 18 },
});
