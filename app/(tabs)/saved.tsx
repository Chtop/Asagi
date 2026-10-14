import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, Pressable, SectionList, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { EmptyState, Screen } from "@/src/components/ui";
import { savedFile } from "@/src/lib/disk";
import { transientImage } from "@/src/lib/imageCache";
import type { GalleryItem } from "@/src/lib/gallery";
import { galleryHref } from "@/src/lib/navigation";
import { setGallerySession } from "@/src/state/gallerySession";
import { useSavedMedia } from "@/src/state/SavedMediaContext";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { SavedMedia } from "@/src/storage/model";

const COLUMNS = 3;
const GAP = 2;

type Album = { board: string; count: number; data: SavedMedia[][] };

function kindLabel(kind: SavedMedia["kind"]): string {
  if (kind === "webm") return "WebM";
  if (kind === "mp4") return "MP4";
  return "IMG";
}

function albumsFor(items: SavedMedia[]): Album[] {
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
  return order.map((board) => {
    const files = groups.get(board) ?? [];
    const data: SavedMedia[][] = [];
    for (let index = 0; index < files.length; index += COLUMNS) {
      data.push(files.slice(index, index + COLUMNS));
    }
    return { board, count: files.length, data };
  });
}

export default function SavedMediaScreen() {
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const { items, remove, share } = useSavedMedia();
  const albums = albumsFor(items);
  const tile = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const openAt = (item: SavedMedia) => {
    const album = items.filter((entry) => (entry.board || "saved") === (item.board || "saved"));
    const playable = album.flatMap((entry) => {
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

  const askActions = (item: SavedMedia) => {
    Alert.alert(item.originalName, item.board ? `/${item.board}/${item.postNo}` : `#${item.postNo}`, [
      { text: "Share", onPress: () => void share(item) },
      { text: "Remove", style: "destructive", onPress: () => confirmRemove(item) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Screen>
      <SectionList
        sections={albums}
        keyExtractor={(row) => row.map((item) => item.id).join("-")}
        stickySectionHeadersEnabled
        contentContainerStyle={items.length === 0 ? styles.empty : styles.list}
        renderSectionHeader={({ section }) => (
          <View style={[styles.header, { backgroundColor: palette.background }]}>
            <Text style={[styles.headerText, { color: palette.text }]}>/{section.board}/</Text>
            <Text style={{ color: palette.textMuted, fontSize: 13 }}>{section.count}</Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {row.map((item) => {
              const file = savedFile(item.filename, item.board);
              const showImage = item.kind === "image" && file.exists;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${item.originalName}, ${kindLabel(item.kind)}`}
                  accessibilityHint="Opens the file. Hold for share or remove."
                  onPress={() => openAt(item)}
                  onLongPress={() => askActions(item)}
                  style={[styles.tile, { width: tile, height: tile, backgroundColor: palette.surfaceAlt }]}
                >
                  {showImage ? (
                    <Image
                      source={{ uri: file.uri }}
                      recyclingKey={file.uri}
                      cachePolicy={transientImage}
                      contentFit="cover"
                      style={StyleSheet.absoluteFill}
                    />
                  ) : (
                    <Text style={[styles.kind, { color: palette.text }]}>{kindLabel(item.kind)}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
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
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerText: { fontSize: 17, fontWeight: "700" },
  row: { flexDirection: "row", gap: GAP, marginBottom: GAP },
  tile: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  kind: { fontSize: 13, fontWeight: "700" },
});
