import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatWhen } from "@/src/lib/format";
import { useAppTheme } from "@/src/state/SettingsContext";

export function ThreadLinkRow({
  board,
  threadId,
  title,
  thumbnailUrl,
  replyCount,
  at,
  atLabel,
  onPress,
  onRemove,
}: {
  board: string;
  threadId: number;
  title: string;
  thumbnailUrl: string | null;
  replyCount: number | null;
  at: number;
  atLabel: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  const { palette } = useAppTheme();

  return (
    <View style={[styles.row, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} recyclingKey={thumbnailUrl} contentFit="cover" style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.placeholder, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>/{board}/</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text numberOfLines={2} style={[styles.title, { color: palette.text }]}>
            {title}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            /{board}/{threadId}
            {replyCount != null ? ` · ${replyCount === 1 ? "1 reply" : `${replyCount} replies`}` : ""}
          </Text>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            {atLabel} {formatWhen(at)}
          </Text>
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Remove" hitSlop={8} onPress={onRemove}>
        <Text style={{ color: palette.danger, fontWeight: "700" }}>Remove</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: "600" },
});
