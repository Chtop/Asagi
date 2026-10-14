import { Stack, router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { Screen } from "@/src/components/ui";
import { useAppTheme } from "@/src/state/SettingsContext";

export default function NotFoundScreen() {
  const { palette } = useAppTheme();

  return (
    <Screen>
      <Stack.Screen options={{ title: "Introuvable" }} />
      <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.body}>
        <Text style={[styles.title, { color: palette.text }]}>Cette page n'existe pas.</Text>
        <Text style={[styles.back, { color: palette.accent }]}>Retour aux boards</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  back: { fontSize: 15, fontWeight: "600" },
});
