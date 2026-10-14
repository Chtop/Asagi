import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { previewFor, thumbnailFor } from "@/src/api/media";
import { replySummary, threadTitle } from "@/src/lib/format";
import { useAppTheme } from "@/src/state/SettingsContext";
import { useLibrary } from "@/src/state/LibraryContext";
import type { CatalogView } from "@/src/storage/model";
import type { Post } from "@/src/types/fourchan";

export function CatalogCard({
  board,
  post,
  onPress,
  layout = "grid",
}: {
  board: string;
  post: Post;
  onPress: () => void;
  layout?: CatalogView;
}) {
  const { palette } = useAppTheme();
  const { isFavorite, toggleFavorite } = useLibrary();
  const title = threadTitle(post, board);
  const preview = previewFor(board, post);
  const thumb = thumbnailFor(board, post);
  const favorite = isFavorite(board, post.no);
  const spoiler = post.spoiler === 1 && post.tim != null;

  const onFavorite = () => {
    void toggleFavorite({
      board,
      threadId: post.no,
      title,
      thumbnailUrl: thumb,
      replyCount: post.replies ?? null,
    });
  };

  const flags = (
    <View style={styles.flags}>
      {post.sticky === 1 ? <Text style={[styles.flag, { color: palette.accent }]}>Épinglé</Text> : null}
      {post.closed === 1 ? <Text style={[styles.flag, { color: palette.textMuted }]}>Fermé</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        hitSlop={8}
        onPress={onFavorite}
      >
        <Text style={{ color: favorite ? palette.accent : palette.textMuted, fontWeight: "700" }}>
          {favorite ? "En favori" : "Favori"}
        </Text>
      </Pressable>
    </View>
  );

  if (layout === "list") {
    const shown = thumb ?? (spoiler ? null : preview);
    return (
      <View style={[styles.rowCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.85 : 1 }]}
        >
          {shown ? (
            <Image
              source={{ uri: shown }}
              recyclingKey={shown}
              contentFit="cover"
              style={[styles.rowThumb, { backgroundColor: palette.surfaceAlt }]}
              transition={120}
            />
          ) : (
            <View style={[styles.rowThumb, styles.placeholder, { backgroundColor: palette.surfaceAlt }]}>
              <Text style={{ color: palette.textMuted, fontWeight: "700", fontSize: 12 }}>
                {spoiler ? "Spoiler" : `/${board}/`}
              </Text>
            </View>
          )}
          <View style={styles.rowBody}>
            <Text numberOfLines={2} style={[styles.rowTitle, { color: palette.text }]}>
              {title}
            </Text>
            <Text style={[styles.meta, { color: palette.textMuted }]}>{replySummary(post.replies, post.images)}</Text>
          </View>
        </Pressable>
        {flags}
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {preview ? (
          <Image
            source={{ uri: preview }}
            recyclingKey={preview}
            contentFit="cover"
            style={[styles.thumb, { backgroundColor: palette.surfaceAlt }]}
            transition={120}
          />
        ) : (
          <View style={[styles.thumb, styles.placeholder, { backgroundColor: palette.surfaceAlt }]}>
            <Text style={{ color: palette.textMuted, fontWeight: "700" }}>{spoiler ? "Spoiler" : `/${board}/`}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text numberOfLines={3} style={[styles.title, { color: palette.text }]}>
            {title}
          </Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>{replySummary(post.replies, post.images)}</Text>
        </View>
      </Pressable>
      {flags}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  thumb: { width: "100%", height: 180 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  body: { padding: 10, gap: 6 },
  title: { fontSize: 14, lineHeight: 18, minHeight: 54 },
  meta: { fontSize: 12 },
  flags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  flag: { fontSize: 12, fontWeight: "700" },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 8 },
  rowThumb: { width: 84, height: 84, borderRadius: 8 },
  rowBody: { flex: 1, gap: 4, minWidth: 0 },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
});
