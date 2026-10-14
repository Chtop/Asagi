import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/state/SettingsContext";

export function ScrollDock({
  refreshing = false,
  onRefresh,
  onTop,
  onBottom,
}: {
  refreshing?: boolean;
  onRefresh: () => void;
  onTop: () => void;
  onBottom: () => void;
}) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 12 }]}>
      <View style={[styles.bar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          accessibilityState={{ disabled: refreshing, busy: refreshing }}
          disabled={refreshing}
          onPress={onRefresh}
          style={styles.button}
        >
          {refreshing ? (
            <ActivityIndicator color={palette.accent} size="small" />
          ) : (
            <Text style={[styles.label, { color: palette.text }]}>Refresh</Text>
          )}
        </Pressable>
        <View style={[styles.rule, { backgroundColor: palette.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Top" onPress={onTop} style={styles.button}>
          <Text style={[styles.label, { color: palette.text }]}>Top</Text>
        </Pressable>
        <View style={[styles.rule, { backgroundColor: palette.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Bottom" onPress={onBottom} style={styles.button}>
          <Text style={[styles.label, { color: palette.text }]}>Bottom</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  button: {
    minWidth: 72,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  label: { fontSize: 13, fontWeight: "700" },
  rule: { width: StyleSheet.hairlineWidth, height: 18 },
});
