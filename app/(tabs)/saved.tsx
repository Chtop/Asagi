import { Image } from "expo-image";
import { router } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

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

export default function SavedMediaScreen() {
  const { palette } = useAppTheme();
  const { items, remove, share } = useSavedMedia();

  const openAt = (item: SavedMedia) => {
    const playable = items.flatMap((entry) => {
      const file = savedFile(entry.filename);
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
      Alert.alert("Média", "Ce fichier n'est plus sur l'appareil.");
      return;
    }
    setGallerySession({ items: playable, index });
    router.push(galleryHref());
  };

  const confirmRemove = (item: SavedMedia) => {
    Alert.alert("Retirer ce média", "Le fichier est supprimé de l'app. La photothèque n'est pas modifiée.", [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", style: "destructive", onPress: () => void remove(item.id) },
    ]);
  };

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.empty : undefined}
        renderItem={({ item }) => {
          const file = savedFile(item.filename);
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
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>Gardé {formatWhen(item.savedAt)}</Text>
                </View>
              </Pressable>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Partager" hitSlop={8} onPress={() => void share(item)}>
                  <Text style={{ color: palette.accent, fontWeight: "700" }}>Partager</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Retirer" hitSlop={8} onPress={() => confirmRemove(item)}>
                  <Text style={{ color: palette.danger, fontWeight: "700" }}>Retirer</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="Aucun média gardé"
            detail="Ouvre une image ou une vidéo, puis appuie sur Garder. Ces fichiers restent après un vidage du cache."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flexGrow: 1 },
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
