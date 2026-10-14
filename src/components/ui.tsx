import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/state/SettingsContext";

export function Screen({ children }: { children: ReactNode }) {
  const { palette } = useAppTheme();
  return <View style={[styles.screen, { backgroundColor: palette.background }]}>{children}</View>;
}

export function LoadingState({ label = "Chargement…" }: { label?: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={palette.accent} />
      <Text style={[styles.muted, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      {detail ? <Text style={[styles.muted, { color: palette.textMuted }]}>{detail}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: palette.text }]}>Échec du chargement</Text>
      <Text style={[styles.muted, { color: palette.textMuted }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={[styles.button, { backgroundColor: palette.accent }]}
        >
          <Text style={{ color: palette.accentText, fontWeight: "700" }}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  const { palette } = useAppTheme();
  if (!message) return null;
  return <Text style={[styles.banner, { color: palette.danger }]}>{message}</Text>;
}

export function SafetyBadge({ worksafe }: { worksafe: boolean }) {
  const { palette } = useAppTheme();
  const color = worksafe ? palette.sfw : palette.nsfw;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{worksafe ? "WORKSAFE" : "NSFW"}</Text>
    </View>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? palette.accent : palette.surfaceAlt,
                borderColor: selected ? palette.accent : palette.border,
              },
            ]}
          >
            <Text style={{ color: selected ? palette.accentText : palette.text, fontWeight: "600" }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  muted: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  button: { marginTop: 8, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  banner: { paddingHorizontal: 16, paddingTop: 8, fontSize: 13 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
});
