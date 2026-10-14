import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { mediaForPost, type VisualMedia } from "@/src/api/media";
import { formatBytes } from "@/src/lib/format";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Post } from "@/src/types/fourchan";

function mediaHeight(media: VisualMedia, screenWidth: number): number {
  const frame = Math.min(screenWidth - 32, 520);
  if (!media.width || !media.height) return 220;
  return Math.max(140, Math.min(460, frame * (media.height / media.width)));
}

export function MediaBlock({ board, post, onOpen }: { board: string; post: Post; onOpen: () => void }) {
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const media = mediaForPost(board, post);
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);

  if (media.kind === "none") return null;
  if (media.kind === "deleted") {
    return <Text style={{ color: palette.textMuted }}>Fichier supprimé.</Text>;
  }
  if (media.kind === "unknown") {
    return <Text style={{ color: palette.textMuted }}>Fichier {media.ext} non affiché.</Text>;
  }

  const height = mediaHeight(media, width);
  const meta = [
    media.ext.replace(".", "").toUpperCase(),
    media.width && media.height ? `${media.width}×${media.height}` : null,
    formatBytes(media.bytes),
  ]
    .filter(Boolean)
    .join(" · ");
  const video = media.kind === "mp4" || media.kind === "webm";

  if (media.spoiler && !revealed) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setRevealed(true)}
        style={[styles.spoiler, { height, backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}
      >
        <Text style={{ color: palette.text, fontWeight: "700" }}>Spoiler</Text>
        <Text style={{ color: palette.textMuted }}>{meta}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.block}>
      {failed ? (
        <Text style={{ color: palette.textMuted }}>Image indisponible.</Text>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir dans la galerie" onPress={onOpen}>
          <Image
            source={{ uri: video ? media.thumbUrl : media.fullUrl }}
            recyclingKey={video ? media.thumbUrl : media.fullUrl}
            contentFit={video ? "cover" : "contain"}
            style={{ width: "100%", height, backgroundColor: video ? "#000" : palette.surfaceAlt }}
            onError={() => setFailed(true)}
          />
          {video ? (
            <View style={styles.play} pointerEvents="none">
              <Text style={styles.playText}>Lire</Text>
            </View>
          ) : null}
        </Pressable>
      )}
      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6 },
  spoiler: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  play: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  playText: {
    color: "#fff",
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.55)",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
