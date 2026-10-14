import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchThread } from "@/src/api/fourchan";
import { EdgeBack } from "@/src/components/EdgeBack";
import { PostCard } from "@/src/components/PostCard";
import { ErrorState, LoadingState, Screen } from "@/src/components/ui";
import { galleryItems } from "@/src/lib/gallery";
import type { QuoteTarget } from "@/src/lib/html";
import { boardHref, galleryHref, quotesHref } from "@/src/lib/navigation";
import { citedByMap, conversationAround, directCitations } from "@/src/lib/quotes";
import { one } from "@/src/lib/route";
import { setGallerySession } from "@/src/state/gallerySession";
import { pushQuoteFrame, readQuoteFrame, storeQuotePosts } from "@/src/state/quoteSession";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Post } from "@/src/types/fourchan";

const MISSING = "This post is not in this thread.";

export default function QuoteLevelScreen() {
  const params = useLocalSearchParams<{ level?: string }>();
  const level = Number(one(params.level));
  const frame = Number.isInteger(level) && level >= 0 ? readQuoteFrame(level) : null;
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[] | null>(frame?.posts ?? null);
  const [loadedRevision, setLoadedRevision] = useState(frame?.revision ?? -1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const listRef = useRef<FlatList<Post>>(null);
  const scrollTries = useRef(0);
  const alive = useRef(true);

  if (frame && loadedRevision !== frame.revision) {
    setLoadedRevision(frame.revision);
    setPosts(frame.posts ?? null);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!frame) {
      router.back();
      return;
    }
    if (frame.posts && frame.posts.length > 0) {
      if (!frame.posts.some((post) => post.no === frame.focusId)) setError(MISSING);
      return;
    }
    let cancelled = false;
    const request = ++requestSeq.current;
    setLoading(true);
    setError(null);
    fetchThread(frame.board, String(frame.threadId))
      .then((loaded) => {
        if (cancelled || !alive.current || request !== requestSeq.current) return;
        if (!loaded.some((post) => post.no === frame.focusId)) {
          setError(MISSING);
          return;
        }
        storeQuotePosts(level, loaded);
        setPosts(loaded);
      })
      .catch((caught) => {
        if (cancelled || !alive.current || request !== requestSeq.current) return;
        setError(caught instanceof Error ? caught.message : "Could not load this thread.");
      })
      .finally(() => {
        if (!cancelled && alive.current && request === requestSeq.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [frame, level]);

  const rows = useMemo(
    () => (frame && posts ? conversationAround(posts, frame.focusId) : []),
    [frame, posts],
  );
  const citedBy = useMemo(() => (posts ? citedByMap(posts) : null), [posts]);
  const counts = useMemo(
    () => (frame && posts ? directCitations(posts, frame.focusId) : null),
    [frame, posts],
  );
  const focusIndex = frame ? rows.findIndex((post) => post.no === frame.focusId) : -1;

  useEffect(() => {
    scrollTries.current = 0;
    if (!frame || focusIndex <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: focusIndex, viewPosition: 0.12, animated: false });
    }, 40);
    return () => clearTimeout(timer);
  }, [focusIndex, frame]);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  const onQuote = useCallback(
    (target: QuoteTarget) => {
      if (!frame || !posts) return;
      if (target.kind === "url") {
        Linking.openURL(target.url).catch(() => {
          Alert.alert("Link", "Could not open this link.");
        });
        return;
      }
      if (target.kind === "board") {
        router.push(boardHref(target.board, `/${target.board}/`));
        return;
      }

      const sameThread =
        target.kind === "post" || (target.board === frame.board && target.threadId === frame.threadId);
      if (sameThread) {
        const postId = target.kind === "post" ? target.postId : (target.postId ?? target.threadId);
        if (!posts.some((post) => post.no === postId)) {
          Alert.alert("Quote", MISSING);
          return;
        }
        const next = pushQuoteFrame({ ...frame, posts, focusId: postId }, level);
        router.push(quotesHref(next));
        return;
      }

      const request = ++requestSeq.current;
      setLoading(true);
      fetchThread(target.board, String(target.threadId))
        .then((loaded) => {
          if (!alive.current || request !== requestSeq.current) return;
          const focusId = target.postId ?? target.threadId;
          if (!loaded.some((post) => post.no === focusId)) {
            Alert.alert("Quote", MISSING);
            return;
          }
          const next = pushQuoteFrame(
            { board: target.board, threadId: target.threadId, focusId, posts: loaded },
            level,
          );
          router.push(quotesHref(next));
        })
        .catch((caught) => {
          if (!alive.current || request !== requestSeq.current) return;
          const message = caught instanceof Error ? caught.message : "Could not load this thread.";
          Alert.alert("Quote", message);
        })
        .finally(() => {
          if (alive.current && request === requestSeq.current) setLoading(false);
        });
    },
    [frame, level, posts],
  );

  const onOpenMedia = useCallback(
    (postNo: number) => {
      if (!frame || !posts) return;
      const items = galleryItems(frame.board, posts);
      const index = items.findIndex((item) => item.postNo === postNo);
      if (index < 0) return;
      setGallerySession({ items, index });
      router.push(galleryHref());
    },
    [frame, posts],
  );

  const subtitle = counts
    ? `${counts.quoted.length === 1 ? "1 quote" : `${counts.quoted.length} quotes`} · ${
        counts.replies.length === 1 ? "1 reply" : `${counts.replies.length} replies`
      }`
    : "";

  const retry = () => {
    if (!frame || (frame.posts && frame.posts.length > 0)) return;
    const request = ++requestSeq.current;
    setLoading(true);
    setError(null);
    fetchThread(frame.board, String(frame.threadId))
      .then((loaded) => {
        if (!alive.current || request !== requestSeq.current) return;
        if (!loaded.some((post) => post.no === frame.focusId)) {
          setError(MISSING);
          return;
        }
        storeQuotePosts(level, loaded);
        setPosts(loaded);
      })
      .catch((caught) => {
        if (!alive.current || request !== requestSeq.current) return;
        setError(caught instanceof Error ? caught.message : "Could not load this thread.");
      })
      .finally(() => {
        if (alive.current && request === requestSeq.current) setLoading(false);
      });
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: palette.border }]}>
        <Pressable accessibilityRole="button" onPress={goBack} hitSlop={8} style={styles.side}>
          <Text style={{ color: palette.accent, fontWeight: "700" }}>Back</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.text }]}>{frame ? `#${frame.focusId}` : "Quotes"}</Text>
          {subtitle ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
        <View style={styles.side} />
      </View>
      {loading && !posts ? <LoadingState label="Loading quotes…" /> : null}
      {!posts && error ? <ErrorState message={error} onRetry={frame && !frame.posts ? retry : undefined} /> : null}
      {loading && posts ? <Text style={[styles.alone, { color: palette.textMuted }]}>Loading…</Text> : null}
      {frame && posts ? (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(item) => String(item.no)}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          extraData={frame.focusId}
          onScrollToIndexFailed={(info) => {
            scrollTries.current += 1;
            if (scrollTries.current > 6) return;
            listRef.current?.scrollToOffset({ offset: 240 * info.index, animated: false });
            const attempt = scrollTries.current;
            setTimeout(() => {
              if (scrollTries.current !== attempt) return;
              listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.12, animated: false });
            }, 60);
          }}
          ListHeaderComponent={
            rows.length <= 1 ? (
              <Text style={[styles.alone, { color: palette.textMuted }]}>No other direct quotes.</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <PostCard
              board={frame.board}
              post={item}
              op={item.no === frame.threadId}
              highlight={item.no === frame.focusId}
              citedBy={citedBy?.get(item.no)}
              onOpenMedia={onOpenMedia}
              onQuote={onQuote}
            />
          )}
        />
      ) : null}
      <EdgeBack onBack={goBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heading: { flex: 1, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
  side: { width: 72 },
  alone: { textAlign: "center", paddingHorizontal: 16, paddingBottom: 8 },
});
