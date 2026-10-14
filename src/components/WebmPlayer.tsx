import { LibVlcPlayerView, type LibVlcPlayerViewRef } from "expo-libvlc-player";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

/**
 * AVPlayer ne décode pas le WebM. LibVLC si : VP8, VP9, Vorbis, Opus.
 * LibVLC n'affiche pas de chrome : la barre (lecture, durée, seek, son)
 * est la nôtre. Le lecteur n'est monté que pendant la lecture.
 */
export function WebmPlayer({
  uri,
  height,
  insetBottom = 10,
  onScrubbing,
}: {
  uri: string;
  height: number;
  insetBottom?: number;
  onScrubbing?: (active: boolean) => void;
}) {
  const player = useRef<LibVlcPlayerViewRef>(null);
  const trackWidth = useRef(0);
  const timeRef = useRef(0);
  const durationRef = useRef(0);
  const scrubbing = useRef(false);
  const seekHold = useRef(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [seekable, setSeekable] = useState(true);

  useEffect(() => {
    setPaused(false);
    setError(null);
    setTime(0);
    setDuration(0);
    setScrub(null);
    timeRef.current = 0;
    durationRef.current = 0;
    scrubbing.current = false;
  }, [uri]);

  useEffect(() => {
    return () => onScrubbing?.(false);
  }, [onScrubbing]);

  const shown = scrub ?? time;
  const ratio = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;
  const canSeek = seekable && duration > 0;

  const rememberDuration = (length: number) => {
    if (!Number.isFinite(length) || length <= 0 || durationRef.current > 0) return;
    durationRef.current = length;
    setDuration(length);
  };

  const toggle = () => {
    if (paused) {
      if (duration > 0 && time >= duration - 400) {
        void player.current?.seek(0, "time");
        timeRef.current = 0;
        setTime(0);
      }
      void player.current?.play();
      setPaused(false);
      return;
    }
    void player.current?.pause();
    setPaused(true);
  };

  const pointToTime = (event: GestureResponderEvent) => {
    const width = trackWidth.current;
    if (width <= 0 || duration <= 0) return 0;
    const ratioAt = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
    return Math.round(ratioAt * duration);
  };

  const beginScrub = (event: GestureResponderEvent) => {
    scrubbing.current = true;
    onScrubbing?.(true);
    setScrub(pointToTime(event));
  };

  const moveScrub = (event: GestureResponderEvent) => {
    if (!scrubbing.current) return;
    setScrub(pointToTime(event));
  };

  const endScrub = (event: GestureResponderEvent) => {
    const next = pointToTime(event);
    scrubbing.current = false;
    onScrubbing?.(false);
    setScrub(null);
    timeRef.current = next;
    setTime(next);
    seekHold.current = Date.now() + 500;
    void player.current?.seek(next, "time");
  };

  const cancelScrub = () => {
    scrubbing.current = false;
    onScrubbing?.(false);
    setScrub(null);
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
        mute={muted}
        pictureInPicture={false}
        audioMixingMode="doNotMix"
        contentFit="contain"
        options={["--network-caching=600", "--http-user-agent=Asagi/1.0"]}
        style={{ width: "100%", height, backgroundColor: "#000" }}
        onEncounteredError={(event) => setError(event.message || "Could not play this video.")}
        onPlaying={() => {
          if (!scrubbing.current) setPaused(false);
        }}
        onPaused={() => {
          if (!scrubbing.current) setPaused(true);
        }}
        onStopped={() => setPaused(true)}
        onFirstPlay={(info) => {
          rememberDuration(info.media?.length ?? 0);
          setSeekable(info.media?.seekable !== false);
        }}
        onTimeChanged={(event) => {
          const next = Math.max(0, event.value);
          timeRef.current = next;
          if (scrubbing.current || Date.now() < seekHold.current) return;
          setTime(next);
        }}
        onPositionChanged={(event) => {
          if (durationRef.current > 0 || event.value < 0.02 || timeRef.current < 300) return;
          rememberDuration(Math.round(timeRef.current / event.value));
        }}
      />
      {time === 0 && duration === 0 ? (
        <View pointerEvents="none" style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : null}
      <View style={[styles.bar, { bottom: insetBottom }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? "Play" : "Pause"}
          onPress={toggle}
          hitSlop={6}
          style={styles.iconButton}
        >
          <PlayerIcon name={paused ? "play.fill" : "pause.fill"} label={paused ? "▶" : "❚❚"} />
        </Pressable>
        <Text style={styles.time} accessibilityLabel={`Position ${formatClock(shown)}`}>
          {formatClock(shown)}
        </Text>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Position in the video"
          accessibilityValue={{
            min: 0,
            max: Math.round(duration / 1000),
            now: Math.round(shown / 1000),
            text: duration > 0 ? `${formatClock(shown)} of ${formatClock(duration)}` : formatClock(shown),
          }}
          accessibilityActions={canSeek ? [{ name: "increment" }, { name: "decrement" }] : []}
          onAccessibilityAction={(event) => {
            if (!canSeek) return;
            const delta = event.nativeEvent.actionName === "increment" ? 5000 : -5000;
            const next = Math.min(duration, Math.max(0, shown + delta));
            timeRef.current = next;
            setTime(next);
            seekHold.current = Date.now() + 500;
            void player.current?.seek(next, "time");
          }}
          onLayout={(event) => {
            trackWidth.current = event.nativeEvent.layout.width;
          }}
          onStartShouldSetResponder={() => canSeek}
          onMoveShouldSetResponder={() => canSeek}
          onStartShouldSetResponderCapture={() => canSeek}
          onMoveShouldSetResponderCapture={() => canSeek}
          onResponderTerminationRequest={() => false}
          onResponderGrant={beginScrub}
          onResponderMove={moveScrub}
          onResponderRelease={endScrub}
          onResponderTerminate={cancelScrub}
          style={styles.trackHit}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
            <View style={[styles.knob, { left: `${ratio * 100}%` }]} />
          </View>
        </View>
        <Text style={styles.time}>{duration > 0 ? formatClock(duration) : "--:--"}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={muted ? "Unmute" : "Mute"}
          onPress={() => setMuted((value) => !value)}
          hitSlop={6}
          style={styles.iconButton}
        >
          <PlayerIcon
            name={muted ? "speaker.slash.fill" : "speaker.wave.2.fill"}
            label={muted ? "Muted" : "Sound"}
          />
        </Pressable>
      </View>
    </View>
  );
}

function PlayerIcon({ name, label }: { name: SFSymbol; label: string }) {
  return (
    <SymbolView
      name={{ ios: name }}
      tintColor="#fff"
      size={18}
      fallback={<Text style={styles.fallbackIcon}>{label}</Text>}
    />
  );
}

function formatClock(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const sec = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${sec}`;
  return `${minutes}:${sec}`;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  fallbackText: { color: "#fff", textAlign: "center" },
  loading: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "42%",
    alignItems: "center",
  },
  loadingText: { color: "#fff", fontWeight: "700" },
  bar: {
    position: "absolute",
    left: 28,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackIcon: { color: "#fff", fontWeight: "700", fontSize: 12 },
  time: {
    color: "#fff",
    fontVariant: ["tabular-nums"],
    fontSize: 12,
    fontWeight: "600",
    minWidth: 36,
    textAlign: "center",
  },
  trackHit: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  knob: {
    position: "absolute",
    width: 14,
    height: 14,
    marginLeft: -7,
    top: -5,
    borderRadius: 7,
    backgroundColor: "#fff",
  },
});
