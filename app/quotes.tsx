import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchThread } from "@/src/api/fourchan";
import { EdgeBack } from "@/src/components/EdgeBack";
import { PostCard } from "@/src/components/PostCard";
import { ErrorState, LoadingState, Screen } from "@/src/components/ui";
import { galleryItems } from "@/src/lib/gallery";
import { galleryHref } from "@/src/lib/navigation";
import type { QuoteTarget } from "@/src/lib/html";
import { citedByMap, conversationAround, directCitations } from "@/src/lib/quotes";
import { setGallerySession } from "@/src/state/gallerySession";
import { readQuoteSession } from "@/src/state/quoteSession";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Post } from "@/src/types/fourchan";

type Frame = {
  board: string;
  posts: Post[];
  focusId: number;
  threadId: number;
};

export default function QuotesScreen() {
  const session = useRef(readQuoteSession()).current;
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [stack, setStack] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const listRef = useRef<FlatList<Post>>(null);
  const scrollTries = useRef(0);
  const frame = stack[stack.length - 1] ?? null;

  const loadThread = useCallback((board: string, threadId: number, focusId: number, push: boolean) => {
    const request = ++requestSeq.current;
    setLoading(true);
    setError(null);
    fetchThread(board, String(threadId))
      .then((posts) => {
        if (request !== requestSeq.current) return;
        if (!posts.some((post) => post.no === focusId)) {
          if (push) Alert.alert("Citation", "Ce post n'est pas dans ce thread.");
          else setError("Ce post n'est pas dans ce thread.");
          return;
        }
        const next = { board, posts, focusId, threadId };
        setStack((prev) => (push ? [...prev, next] : [next]));
      })
      .catch((caught) => {
        if (request !== requestSeq.current) return;
        const message = caught instanceof Error ? caught.message : "Impossible de charger ce thread.";
        if (push) Alert.alert("Citation", message);
        else setError(message);
      })
      .finally(() => {
        if (request === requestSeq.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!session) {
      router.back();
      return;
    }
    if (session.posts && session.posts.length > 0) {
      if (!session.posts.some((post) => post.no === session.focusId)) {
        setError("Ce post n'est pas dans ce thread.");
        return;
      }
      setStack([
        {
          board: session.board,
          posts: session.posts,
          focusId: session.focusId,
          threadId: session.threadId,
        },
      ]);
      return;
    }
    loadThread(session.board, session.threadId, session.focusId, false);
  }, [loadThread, session]);

  const rows = useMemo(() => (frame ? conversationAround(frame.posts, frame.focusId) : []), [frame]);
  const citedBy = useMemo(() => (frame ? citedByMap(frame.posts) : null), [frame]);
  const counts = useMemo(() => (frame ? directCitations(frame.posts, frame.focusId) : null), [frame]);
  const focusIndex = frame ? rows.findIndex((post) => post.no === frame.focusId) : -1;

  useEffect(() => {
    scrollTries.current = 0;
    if (!frame || focusIndex <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: focusIndex, viewPosition: 0.12, animated: false });
    }, 40);
    return () => clearTimeout(timer);
  }, [focusIndex, frame]);

  const closeOrPop = useCallback(() => {
    if (stack.length > 1) {
      setStack((prev) => prev.slice(0, -1));
      return;
    }
    router.back();
  }, [stack.length]);

  const onQuote = useCallback(
    (target: QuoteTarget) => {
      if (!frame) return;
      if (target.kind === "url") {
        Linking.openURL(target.url).catch(() => {
          Alert.alert("Lien", "Impossible d'ouvrir ce lien.");
        });
        return;
      }

      const sameThread =
        target.kind === "post" || (target.board === frame.board && target.threadId === frame.threadId);
      if (sameThread) {
        const postId = target.kind === "post" ? target.postId : (target.postId ?? target.threadId);
        if (!frame.posts.some((post) => post.no === postId)) {
          Alert.alert("Citation", "Ce post n'est pas dans ce thread.");
          return;
        }
        setStack((prev) => [...prev, { ...frame, focusId: postId }]);
        return;
      }

      loadThread(target.board, target.threadId, target.postId ?? target.threadId, true);
    },
    [frame, loadThread],
  );

  const onOpenMedia = useCallback(
    (postNo: number) => {
      if (!frame) return;
      const items = galleryItems(frame.board, frame.posts);
      const index = items.findIndex((item) => item.postNo === postNo);
      if (index < 0) return;
      setGallerySession({ items, index });
      router.push(galleryHref());
    },
    [frame],
  );

  const subtitle = counts
    ? `${counts.quoted.length === 1 ? "1 cité" : `${counts.quoted.length} cités`} · ${counts.replies.length === 1 ? "1 qui le cite" : `${counts.replies.length} qui le citent`}`
    : "";

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: palette.border }]}>
        <Pressable accessibilityRole="button" onPress={closeOrPop} hitSlop={8} style={styles.side}>
          <Text style={{ color: palette.accent, fontWeight: "700" }}>{stack.length > 1 ? "Précédent" : "Fermer"}</Text>
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.text }]}>{frame ? `#${frame.focusId}` : "Citations"}</Text>
          {subtitle ? <Text style={{ color: palette.textMuted, fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
        <View style={styles.side} />
      </View>
      {loading && !frame ? <LoadingState label="Chargement des citations…" /> : null}
      {!frame && error ? (
        <ErrorState
          message={error}
          onRetry={
            session && !session.posts
              ? () => loadThread(session.board, session.threadId, session.focusId, false)
              : undefined
          }
        />
      ) : null}
      {loading && frame ? (
        <Text style={[styles.alone, { color: palette.textMuted }]}>Chargement…</Text>
      ) : null}
      {frame ? (
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
              <Text style={[styles.alone, { color: palette.textMuted }]}>Aucune autre citation directe.</Text>
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
      <EdgeBack onBack={closeOrPop} />
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
  side: { width: 108 },
  alone: { textAlign: "center", paddingHorizontal: 16, paddingBottom: 8 },
});
