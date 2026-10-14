import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import { EmptyState, Screen } from "@/src/components/ui";
import { savedFile } from "@/src/lib/disk";
import { formatBytes, formatWhen } from "@/src/lib/format";
import type { GalleryItem } from "@/src/lib/gallery";
import { galleryHref } from "@/src/lib/navigation";
import { setGallerySession } from "@/src/state/gallerySession";
import { useSavedMedia } from "@/src/state/SavedMediaContext";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { SavedMedia } from "@/src/storage/model";

function kindLabel(kind: SavedMedia["kind"]): string {
  if (kind === "webm") return "WebM";
  if (kind === "mp4") return "MP4";
  return "IMG";
}

function sectionsFor(items: SavedMedia[]): { board: string; data: SavedMedia[] }[] {
  const order: string[] = [];
  const groups = new Map<string, SavedMedia[]>();
  for (const item of items) {
    const board = item.board || "saved";
    const group = groups.get(board);
    if (group) group.push(item);
    else {
      groups.set(board, [item]);
      order.push(board);
    }
  }
  return order.map((board) => ({ board, data: groups.get(board) ?? [] }));
}

export default function SavedMediaScreen() {
  const { palette } = useAppTheme();
  const { items, remove, share } = useSavedMedia();
  const sections = sectionsFor(items);

  const openAt = (item: SavedMedia) => {
    const playable = items.flatMap((entry) => {
      const file = savedFile(entry.filename, entry.board);
      if (!file.exists) return [];
      const galleryItem: GalleryItem = {
        postNo: entry.postNo,
        kind: entry.kind,
        url: file.uri,
        thumbUrl: entry.kind === "image" ? file.uri : "",
        filename: entry.filename,
        board: entry.board,
        originalName: entry.originalName,
      };
      return [galleryItem];
    });
    const index = playable.findIndex((entry) => entry.filename === item.filename);
    if (index < 0) {
      Alert.alert("Media", "This file is no longer on the device.");
      return;
    }
    setGallerySession({ items: playable, index });
    router.push(galleryHref());
  };

  const confirmRemove = (item: SavedMedia) => {
    Alert.alert("Remove this file", "The file is deleted from the app. Your photo library is not changed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => void remove(item.id) },
    ]);
  };

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
        renderSectionHeader={({ section }) => (
          <View style={[styles.header, { backgroundColor: palette.background }]}>
            <Text style={[styles.headerText, { color: palette.text }]}>/{section.board}/</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const file = savedFile(item.filename, item.board);
          const size = formatBytes(item.bytes ?? undefined);
          return (
            <View style={[styles.row, { borderBottomColor: palette.border }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openAt(item)}
                style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}
              >
                {item.kind === "image" && file.exists ? (
                  <Image
                    source={{ uri: file.uri }}
                    recyclingKey={file.uri}
                    contentFit="cover"
                    style={[styles.thumb, { backgroundColor: palette.surfaceAlt }]}
                  />
                ) : (
                  <View style={[styles.thumb, styles.placeholder, { backgroundColor: palette.surfaceAlt }]}>
                    <Text style={{ color: palette.textMuted, fontSize: 12, fontWeight: "700" }}>
                      {kindLabel(item.kind)}
                    </Text>
                  </View>
                )}
                <View style={styles.body}>
                  <Text numberOfLines={2} style={[styles.title, { color: palette.text }]}>
                    {item.originalName}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {item.board ? `/${item.board}/${item.postNo}` : `#${item.postNo}`}
                    {size ? ` · ${size}` : ""}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>Kept {formatWhen(item.savedAt)}</Text>
                </View>
              </Pressable>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Share" hitSlop={8} onPress={() => void share(item)}>
                  <Text style={{ color: palette.accent, fontWeight: "700" }}>Share</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Remove" hitSlop={8} onPress={() => confirmRemove(item)}>
                  <Text style={{ color: palette.danger, fontWeight: "700" }}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No saved media"
            detail="Open an image or a video, then tap Keep. These files stay after you clear the cache."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flexGrow: 1 },
  list: { paddingBottom: 24 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  headerText: { fontSize: 15, fontWeight: "700" },
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
  actions: { gap: 10, alignItems: "flex-end" },
});
