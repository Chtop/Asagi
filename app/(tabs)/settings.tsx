import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FilterChips, Screen } from "@/src/components/ui";
import { APP_NAME } from "@/src/config";
import { CATALOG_SORT_OPTIONS, CATALOG_VIEW_OPTIONS, SORT_DIRECTION_OPTIONS } from "@/src/lib/catalogSort";
import { cacheByteSize, clearAppCache } from "@/src/lib/disk";
import { formatBytes } from "@/src/lib/format";
import { useLibrary } from "@/src/state/LibraryContext";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { BoardFilter, ThemePreference } from "@/src/storage/model";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

const FILTERS: { value: BoardFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sfw", label: "Worksafe" },
  { value: "nsfw", label: "NSFW" },
];

function readCacheSize(): number | null {
  try {
    return cacheByteSize();
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const {
    palette,
    settings,
    setTheme,
    setBoardFilter,
    setCatalogSort,
    setCatalogSortDirection,
    setCatalogView,
  } = useAppTheme();
  const { favorites, history, clearFavorites, clearHistory } = useLibrary();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCacheBytes(readCacheSize());
    }, []),
  );

  const cacheLabel =
    cacheBytes == null ? "Cache size unavailable" : `Cache: ${formatBytes(cacheBytes) ?? "0 B"}`;

  const confirm = (title: string, action: () => Promise<void>) => {
    Alert.alert(title, "This cannot be undone on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => void action() },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Theme</Text>
          <FilterChips options={THEMES} value={settings.theme} onChange={setTheme} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Boards shown</Text>
          <FilterChips options={FILTERS} value={settings.boardFilter} onChange={setBoardFilter} />
          <Text style={[styles.note, { color: palette.textMuted }]}>
            The same filter is on the board list. Worksafe and NSFW come from the API ws_board field.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Thread display</Text>
          <Text style={[styles.note, { color: palette.textMuted }]}>Default view</Text>
          <FilterChips options={CATALOG_VIEW_OPTIONS} value={settings.catalogView} onChange={setCatalogView} />
          <Text style={[styles.note, { color: palette.textMuted }]}>Default sort</Text>
          <FilterChips options={CATALOG_SORT_OPTIONS} value={settings.catalogSort} onChange={setCatalogSort} />
          <Text style={[styles.note, { color: palette.textMuted }]}>Default direction</Text>
          <FilterChips
            options={SORT_DIRECTION_OPTIONS}
            value={settings.catalogSortDirection}
            onChange={setCatalogSortDirection}
          />
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Descending puts the original bump order, the newest post, or the highest count first. The sort you pick on
            a board does not change this setting. The view is remembered. History always returns to the last post on
            screen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Cache</Text>
          <Text style={[styles.note, { color: palette.textMuted }]}>
            {cacheLabel}. Full images are shown and not stored. Only small thumbnails can stay on disk, up to 48 MB.
            Clearing the cache removes temporary files. History, favorites, the last post you read, and saved media
            stay.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={clearing}
            onPress={() => {
              Alert.alert(
                "Clear cache",
                "Temporary files and thumbnails will be downloaded again. History, favorites, the last post you read, and saved media stay.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: () => {
                      setClearing(true);
                      void clearAppCache()
                        .then(() => setCacheBytes(readCacheSize()))
                        .catch(() => Alert.alert("Cache", "Could not clear the cache."))
                        .finally(() => setClearing(false));
                    },
                  },
                ],
              );
            }}
            style={[styles.action, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Text style={{ color: palette.text, fontWeight: "600" }}>{clearing ? "Clearing…" : "Clear cache"}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>On this device</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirm("Clear history", clearHistory)}
            style={[styles.action, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Text style={{ color: palette.text, fontWeight: "600" }}>Clear history ({history.length})</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirm("Clear favorites", clearFavorites)}
            style={[styles.action, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Text style={{ color: palette.danger, fontWeight: "600" }}>Clear favorites ({favorites.length})</Text>
          </Pressable>
        </View>

        <Text style={[styles.note, { color: palette.textMuted }]}>
          {APP_NAME} {version} only reads the public API at a.4cdn.org. Nothing is sent to a server of ours. Favorites
          and history stay in AsyncStorage on this device. History remembers the last post on screen: opening a thread
          again returns there. Clearing history clears those positions. Images come from i.4cdn.org. MP4 uses the iOS
          player. WebM, the most common format, uses the built-in player.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24, paddingBottom: 40 },
  section: { gap: 10 },
  heading: { fontSize: 17, fontWeight: "700" },
  note: { fontSize: 13, lineHeight: 19 },
  action: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
