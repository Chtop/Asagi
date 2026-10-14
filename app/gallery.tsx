import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EdgeBack } from "@/src/components/EdgeBack";
import { WebmPlayer } from "@/src/components/WebmPlayer";
import type { GalleryItem } from "@/src/lib/gallery";
import { downloadToCache, saveInPhotoLibrary } from "@/src/lib/saveMedia";
import { readGallerySession } from "@/src/state/gallerySession";
import { useSavedMedia } from "@/src/state/SavedMediaContext";

function Mp4Player({ uri, width, height }: { uri: string; width: number; height: number }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
    instance.play();
  });

  return (
    <VideoView
      player={player}
      style={{ width, height, backgroundColor: "#000" }}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture={false}
    />
  );
}

function ZoomImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  return (
    <ScrollView
      style={{ width, height }}
      contentContainerStyle={styles.zoom}
      maximumZoomScale={4}
      minimumZoomScale={1}
      centerContent
      bouncesZoom
      pinchGestureEnabled
      directionalLockEnabled
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width, height }} collapsable={false}>
        <Image source={{ uri }} contentFit="contain" style={{ width, height }} />
      </View>
    </ScrollView>
  );
}

function GalleryPage({
  item,
  active,
  width,
  height,
  insetBottom,
  onScrubbing,
}: {
  item: GalleryItem;
  active: boolean;
  width: number;
  height: number;
  insetBottom: number;
  onScrubbing?: (active: boolean) => void;
}) {
  if (item.kind === "image") return <ZoomImage uri={item.url} width={width} height={height} />;
  if (!active) {
    if (!item.thumbUrl) {
      return (
        <View style={[styles.poster, { width, height }]}>
          <Text style={styles.posterText}>{item.kind === "webm" ? "WebM" : "MP4"}</Text>
        </View>
      );
    }
    return (
      <Image
        source={{ uri: item.thumbUrl }}
        contentFit="contain"
        style={{ width, height, backgroundColor: "#000" }}
      />
    );
  }
  if (item.kind === "mp4") return <Mp4Player uri={item.url} width={width} height={height} />;
  return (
    <WebmPlayer uri={item.url} height={height} insetBottom={insetBottom} onScrubbing={onScrubbing} />
  );
}

export default function GalleryScreen() {
  const session = useRef(readGallerySession()).current;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { keep } = useSavedMedia();
  const [index, setIndex] = useState(session?.index ?? 0);
  const [busy, setBusy] = useState<"save" | "keep" | "share" | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const listRef = useRef<FlatList<GalleryItem>>(null);
  const jumped = useRef(false);

  useEffect(() => {
    if (!session || session.items.length === 0) router.back();
  }, [session]);

  if (!session || session.items.length === 0 || width <= 0) return null;

  const current = session.items[index] ?? session.items[0];

  const local = current.url.startsWith("file:");

  const onSave = async () => {
    if (busy || !current) return;
    setBusy("save");
    try {
      const uri = local ? current.url : await downloadToCache(current.url, current.filename);
      if (current.kind === "webm") {
        await Share.share({ url: uri });
        return;
      }
      const album = await saveInPhotoLibrary(uri, current.board);
      Alert.alert("Saved", `Saved in the album ${album}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save this file.";
      if (/did not share|cancel/i.test(message)) return;
      Alert.alert("Save", message);
    } finally {
      setBusy(null);
    }
  };

  const onKeep = async () => {
    if (busy || !current || local) return;
    setBusy("keep");
    try {
      const result = await keep({
        url: current.url,
        filename: current.filename,
        originalName: current.originalName,
        kind: current.kind,
        board: current.board,
        postNo: current.postNo,
      });
      Alert.alert(
        result === "exists" ? "Already kept" : "Kept",
        result === "exists" ? "Already in your media." : `Kept in /${current.board}/. Find it in the Media tab.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not keep this file.";
      Alert.alert("Media", message);
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (busy || !current) return;
    setBusy("share");
    try {
      await Share.share({ url: current.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/did not share|cancel/i.test(message)) return;
      Alert.alert("Share", "Could not share this file.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={session.items}
        horizontal
        pagingEnabled
        scrollEnabled={!scrubbing}
        bounces={false}
        extraData={`${index}:${width}`}
        initialScrollIndex={session.index}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
        keyExtractor={(item) => item.filename}
        showsHorizontalScrollIndicator={false}
        windowSize={3}
        onLayout={() => {
          if (jumped.current || session.index <= 0) return;
          jumped.current = true;
          listRef.current?.scrollToIndex({ index: session.index, animated: false });
        }}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex(Math.max(0, Math.min(session.items.length - 1, next)));
        }}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: width * info.index, animated: false });
        }}
        style={styles.list}
        renderItem={({ item, index: pageIndex }) => (
          <View style={{ width, height }}>
            <GalleryPage
              item={item}
              active={pageIndex === index}
              width={width}
              height={height}
              insetBottom={insets.bottom + 16}
              onScrubbing={setScrubbing}
            />
          </View>
        )}
      />
      <View style={[styles.bar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Text style={styles.counter}>
          {index + 1} / {session.items.length}
        </Text>
        <View style={styles.actions}>
          {local ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={() => void onShare()}
              disabled={busy !== null}
              style={styles.action}
            >
              <Text style={styles.actionText}>{busy === "share" ? "…" : "Share"}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep in the app"
              onPress={() => void onKeep()}
              disabled={busy !== null}
              style={styles.action}
            >
              <Text style={styles.actionText}>{busy === "keep" ? "…" : "Keep"}</Text>
            </Pressable>
          )}
          {local && current.kind === "webm" ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={current.kind === "webm" ? "Save to Files" : "Save to Photos"}
              onPress={() => void onSave()}
              disabled={busy !== null}
              style={styles.action}
            >
              <Text style={styles.actionText}>
                {busy === "save" ? "…" : current.kind === "webm" ? "To Files" : "Save"}
              </Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.action}>
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
      </View>
      <EdgeBack onBack={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  list: { flex: 1 },
  zoom: { alignItems: "center", justifyContent: "center" },
  poster: { backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  posterText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  bar: {
    position: "absolute",
    left: 28,
    right: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  counter: { color: "#fff", fontWeight: "700", fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, flexShrink: 1 },
  action: {
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: { color: "#fff", fontWeight: "700" },
});
