import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { mediaForPost, type VisualMedia } from "@/src/api/media";
import { WebmPlayer } from "@/src/components/WebmPlayer";
import { formatBytes } from "@/src/lib/format";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Post } from "@/src/types/fourchan";

function mediaHeight(media: VisualMedia, screenWidth: number): number {
  const frame = Math.min(screenWidth - 32, 520);
  if (!media.width || !media.height) return 220;
  return Math.max(140, Math.min(460, frame * (media.height / media.width)));
}

function Mp4Player({ uri, height }: { uri: string; height: number }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height, backgroundColor: "#000" }}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture={false}
    />
  );
}

export function MediaBlock({
  board,
  post,
  playing,
  onPlay,
  onStop,
  onOpenImage,
}: {
  board: string;
  post: Post;
  playing: boolean;
  onPlay: () => void;
  onStop: () => void;
  onOpenImage: (uri: string) => void;
}) {
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
  const meta = [media.ext.replace(".", "").toUpperCase(), media.width && media.height ? `${media.width}×${media.height}` : null, formatBytes(media.bytes)]
    .filter(Boolean)
    .join(" · ");

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
      {media.kind === "image" && !failed ? (
        <Pressable accessibilityRole="button" onPress={() => onOpenImage(media.fullUrl)}>
          <Image
            source={{ uri: media.ext === ".gif" ? media.fullUrl : media.thumbUrl }}
            recyclingKey={media.thumbUrl}
            contentFit="contain"
            style={{ width: "100%", height, backgroundColor: palette.surfaceAlt }}
            onError={() => setFailed(true)}
          />
        </Pressable>
      ) : null}

      {media.kind === "mp4" && playing ? <Mp4Player uri={media.fullUrl} height={height} /> : null}

      {media.kind === "mp4" && !playing ? (
        <Pressable accessibilityRole="button" onPress={onPlay}>
          <Image
            source={{ uri: media.thumbUrl }}
            contentFit="cover"
            style={{ width: "100%", height, backgroundColor: "#000" }}
          />
          <View style={styles.play}>
            <Text style={styles.playText}>Lire la vidéo</Text>
          </View>
        </Pressable>
      ) : null}

      {media.kind === "webm" && playing ? <WebmPlayer uri={media.fullUrl} height={height} /> : null}

      {media.kind === "webm" && !playing ? (
        <Pressable accessibilityRole="button" onPress={onPlay}>
          <Image
            source={{ uri: media.thumbUrl }}
            contentFit="cover"
            style={{ width: "100%", height, backgroundColor: "#000" }}
          />
          <View style={styles.play}>
            <Text style={styles.playText}>Lire la vidéo</Text>
          </View>
        </Pressable>
      ) : null}

      {failed ? <Text style={{ color: palette.textMuted }}>Image indisponible.</Text> : null}

      <View style={styles.metaRow}>
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{meta}</Text>
        {playing ? (
          <Pressable accessibilityRole="button" onPress={onStop} hitSlop={8}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>Fermer la vidéo</Text>
          </Pressable>
        ) : null}
      </View>
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
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
});
