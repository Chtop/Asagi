import { LibVlcPlayerView, type LibVlcPlayerViewRef } from "expo-libvlc-player";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * AVPlayer ne décode pas le WebM. LibVLC si : VP8, VP9, Vorbis, Opus.
 * Le lecteur n'est monté que pendant la lecture, pour ne pas décoder
 * toutes les vidéos d'un thread en même temps.
 */
export function WebmPlayer({
  uri,
  height,
  insetBottom = 10,
}: {
  uri: string;
  height: number;
  insetBottom?: number;
}) {
  const player = useRef<LibVlcPlayerViewRef>(null);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    if (paused) {
      void player.current?.play();
      setPaused(false);
      return;
    }
    void player.current?.pause();
    setPaused(true);
  };

  if (error) {
    return (
      <View style={[styles.fallback, { height }]}>
        <Text style={styles.fallbackText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ height, backgroundColor: "#000" }}>
      <LibVlcPlayerView
        ref={player}
        source={uri}
        autoplay
        pictureInPicture={false}
        audioMixingMode="doNotMix"
        contentFit="contain"
        options={["--network-caching=600", "--http-user-agent=Asagi/1.0"]}
        style={{ width: "100%", height, backgroundColor: "#000" }}
        onEncounteredError={(event) => setError(event.message || "Impossible de lire cette vidéo.")}
      />
      <Pressable
        accessibilityRole="button"
        onPress={toggle}
        style={[styles.control, { bottom: insetBottom }]}
        hitSlop={8}
      >
        <Text style={styles.controlText}>{paused ? "Lecture" : "Pause"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  fallbackText: { color: "#fff", textAlign: "center" },
  control: {
    position: "absolute",
    left: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlText: { color: "#fff", fontWeight: "700" },
});
