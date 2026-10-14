import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { thumbnailFor } from "@/src/api/media";
import { replySummary, threadTitle } from "@/src/lib/format";
import { useAppTheme } from "@/src/state/SettingsContext";
import { useLibrary } from "@/src/state/LibraryContext";
import type { Post } from "@/src/types/fourchan";

export function CatalogCard({
  board,
  post,
  onPress,
}: {
  board: string;
  post: Post;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  const { isFavorite, toggleFavorite } = useLibrary();
  const title = threadTitle(post, board);
  const thumb = thumbnailFor(board, post);
  const favorite = isFavorite(board, post.no);
  const spoiler = post.spoiler === 1 && post.tim != null;

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            recyclingKey={thumb}
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
      <View style={styles.flags}>
        {post.sticky === 1 ? <Text style={[styles.flag, { color: palette.accent }]}>Épinglé</Text> : null}
        {post.closed === 1 ? <Text style={[styles.flag, { color: palette.textMuted }]}>Fermé</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          hitSlop={8}
          onPress={() => {
            void toggleFavorite({
              board,
              threadId: post.no,
              title,
              thumbnailUrl: thumb,
              replyCount: post.replies ?? null,
            });
          }}
        >
          <Text style={{ color: favorite ? palette.accent : palette.textMuted, fontWeight: "700" }}>
            {favorite ? "En favori" : "Favori"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: "hidden" },
  thumb: { width: "100%", height: 120 },
  placeholder: { alignItems: "center", justifyContent: "center" },
  body: { padding: 10, gap: 6 },
  title: { fontSize: 14, lineHeight: 18, minHeight: 54 },
  meta: { fontSize: 12 },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", paddingHorizontal: 10, paddingBottom: 10 },
  flag: { fontSize: 12, fontWeight: "700" },
});
