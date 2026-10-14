import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { ViewToken } from "@react-native/virtualized-lists";

import { fetchThread } from "@/src/api/fourchan";
import { isBoardCode } from "@/src/api/ids";
import { thumbnailFor } from "@/src/api/media";
import { PostCard } from "@/src/components/PostCard";
import { ErrorBanner, ErrorState, LoadingState, Screen } from "@/src/components/ui";
import { threadTitle } from "@/src/lib/format";
import { galleryItems } from "@/src/lib/gallery";
import type { QuoteTarget } from "@/src/lib/html";
import { boardHref, galleryHref, quotesHref } from "@/src/lib/navigation";
import { citedByMap } from "@/src/lib/quotes";
import { one } from "@/src/lib/route";
import { setGallerySession } from "@/src/state/gallerySession";
import { openQuotes } from "@/src/state/quoteSession";
import { indexForPostNo } from "@/src/storage/model";
import { useAppTheme } from "@/src/state/SettingsContext";
import { useLibrary } from "@/src/state/LibraryContext";
import type { Post } from "@/src/types/fourchan";

const POSITION_DEBOUNCE_MS = 350;
const ANCHOR_GIVE_UP_MS = 1600;

export default function ThreadScreen() {
  const params = useLocalSearchParams<{ board: string; threadId: string; focus?: string }>();
  const board = one(params.board).toLowerCase();
  const threadId = one(params.threadId);
  const focus = one(params.focus);
  // Un autre thread réutilise cette route : on remonte l'écran pour ne pas
  // garder le scroll, ni la position, du thread précédent.
  return <ThreadBody key={`${board}:${threadId}`} board={board} threadId={threadId} focus={focus} />;
}

function ThreadBody({ board, threadId, focus }: { board: string; threadId: string; focus: string }) {
  const { palette } = useAppTheme();
  const { isFavorite, toggleFavorite, remember, positionFor, markPosition } = useLibrary();
  const [posts, setPosts] = useState<Post[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [placedKey, setPlacedKey] = useState<string | null>(null);
  const hasData = useRef(false);
  const listRef = useRef<FlatList<Post>>(null);
  const rememberedKey = useRef("");
  const requestSeq = useRef(0);
  const alive = useRef(true);
  const handledKey = useRef("");
  const placedKeyRef = useRef<string | null>(null);
  // Post qu'on est en train d'afficher. Tant qu'il n'est pas vraiment visible,
  // on n'enregistre pas le haut de liste : ça effacerait la position sauvée.
  const anchorLock = useRef<number | null>(null);
  const allowSaveRef = useRef(false);
  const latestPostNo = useRef<number | null>(null);
  const scrollAnimated = useRef(false);
  const scrollViewPosition = useRef(0);
  const scrollRetries = useRef(0);
  const placeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giveUpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardRef = useRef(board);
  const threadNoRef = useRef(Number(threadId));
  const markPositionRef = useRef(markPosition);
  boardRef.current = board;
  threadNoRef.current = Number(threadId);
  markPositionRef.current = markPosition;

  const valid = isBoardCode(board) && /^[1-9]\d{0,15}$/.test(threadId);
  const op = posts[0];
  const title = op ? threadTitle(op, board) : `/${board}/${threadId}`;
  const favorite = isFavorite(board, Number(threadId));
  const placeKey = `${board}:${threadId}:${focus}`;
  const placeKeyRef = useRef(placeKey);
  placeKeyRef.current = placeKey;

  // Figé au premier rendu du thread : un scroll ne doit pas relancer le saut.
  // Une citation (?focus=) gagne sur la position enregistrée.
  const resume = useMemo(() => {
    const focusId = Number(focus);
    if (Number.isSafeInteger(focusId) && focusId > 0) {
      return { postNo: focusId, mode: "exact" as const };
    }
    const saved = positionFor(board, Number(threadId));
    if (saved == null) return null;
    return { postNo: saved, mode: "nearest" as const };
  }, [board, focus, positionFor, threadId]);

  const postNos = useMemo(() => posts.map((post) => post.no), [posts]);
  const targetIndex =
    phase === "ready" && posts.length > 0 && resume ? indexForPostNo(postNos, resume.postNo, resume.mode) : null;
  const needsAnchor = targetIndex != null && targetIndex > 0 && placedKey !== placeKey;
  if (needsAnchor) allowSaveRef.current = false;

  const clearAnchorTimers = useCallback(() => {
    if (placeTimer.current) clearTimeout(placeTimer.current);
    if (giveUpTimer.current) clearTimeout(giveUpTimer.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    placeTimer.current = null;
    giveUpTimer.current = null;
    revealTimer.current = null;
  }, []);

  const showPlaced = useCallback(
    (key: string) => {
      if (!alive.current || placeKeyRef.current !== key) return;
      clearAnchorTimers();
      if (placedKeyRef.current === key) return;
      placedKeyRef.current = key;
      setPlacedKey(key);
    },
    [clearAnchorTimers],
  );

  const flushPosition = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const postNo = anchorLock.current ?? latestPostNo.current;
    if (postNo == null) return;
    if (anchorLock.current == null && !allowSaveRef.current) return;
    markPositionRef.current(boardRef.current, threadNoRef.current, postNo);
  }, []);

  const scheduleSave = useCallback((postNo: number) => {
    latestPostNo.current = postNo;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      if (!allowSaveRef.current || latestPostNo.current !== postNo) return;
      markPositionRef.current(boardRef.current, threadNoRef.current, postNo);
    }, POSITION_DEBOUNCE_MS);
  }, []);

  const flushRef = useRef(flushPosition);
  const scheduleRef = useRef(scheduleSave);
  const showPlacedRef = useRef(showPlaced);
  flushRef.current = flushPosition;
  scheduleRef.current = scheduleSave;
  showPlacedRef.current = showPlaced;

  const tryScroll = useCallback((index: number) => {
    if (!alive.current) return;
    const before = scrollRetries.current;
    listRef.current?.scrollToIndex({
      index,
      animated: scrollAnimated.current,
      viewPosition: scrollViewPosition.current,
    });
    // L'échec est synchrone tant que la cellule n'est pas mesurée.
    if (scrollRetries.current !== before || scrollAnimated.current) return;
    if (revealTimer.current) clearTimeout(revealTimer.current);
    const key = placeKeyRef.current;
    revealTimer.current = setTimeout(() => {
      revealTimer.current = null;
      showPlacedRef.current(key);
    }, 120);
  }, []);

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 20,
    minimumViewTime: 80,
  }).current;

  const onViewableItemsChanged = useRef((info: { viewableItems: Array<ViewToken<Post>> }) => {
    const visible = info.viewableItems.filter(
      (token): token is ViewToken<Post> & { index: number } => token.isViewable && token.index != null,
    );
    if (visible.length === 0) return;
    visible.sort((left, right) => left.index - right.index);
    const top = visible[0].item;
    const locked = anchorLock.current;
    // Le message doit être en haut, pas seulement quelque part à l'écran :
    // sinon on dévoilerait la liste avant le scroll.
    if (locked != null) {
      if (top.no !== locked) return;
      anchorLock.current = null;
      allowSaveRef.current = true;
      showPlacedRef.current(placeKeyRef.current);
      scheduleRef.current(locked);
      return;
    }
    if (!allowSaveRef.current || top.no == null) return;
    scheduleRef.current(top.no);
  }).current;

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      const request = ++requestSeq.current;
      if (!valid) {
        setBanner("Invalid thread address.");
        setPhase("error");
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setPhase("loading");
      try {
        const next = await fetchThread(board, threadId);
        if (!alive.current || request !== requestSeq.current) return;
        hasData.current = next.length > 0;
        setPosts(next);
        setPhase("ready");
        setBanner(next.length === 0 ? "This thread has no posts." : null);
      } catch (error) {
        if (!alive.current || request !== requestSeq.current) return;
        const message = error instanceof Error ? error.message : "Unknown error.";
        if (mode === "refresh" && hasData.current) setBanner(message);
        else {
          setBanner(message);
          setPhase("error");
        }
      } finally {
        if (alive.current && request === requestSeq.current) setRefreshing(false);
      }
    },
    [board, threadId, valid],
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        flushRef.current();
      };
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") flushRef.current();
    });
    return () => {
      sub.remove();
      flushRef.current();
    };
  }, []);

  useEffect(() => {
    hasData.current = false;
    rememberedKey.current = "";
    void load("initial");
    return () => {
      flushRef.current();
      anchorLock.current = null;
      allowSaveRef.current = false;
      latestPostNo.current = null;
      handledKey.current = "";
      clearAnchorTimers();
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    };
  }, [clearAnchorTimers, load]);

  useEffect(() => {
    if (!op) return;
    const key = `${board}:${threadId}:${op.no}:${title}`;
    if (rememberedKey.current === key) return;
    rememberedKey.current = key;
    void remember({
      board,
      threadId: op.no,
      title,
      thumbnailUrl: thumbnailFor(board, op),
      replyCount: op.replies ?? null,
    });
  }, [board, op, remember, threadId, title]);

  useEffect(() => {
    if (phase !== "ready" || posts.length === 0) return;
    if (handledKey.current === placeKey) return;
    handledKey.current = placeKey;
    clearAnchorTimers();
    scrollRetries.current = 0;

    const index = resume ? indexForPostNo(posts.map((post) => post.no), resume.postNo, resume.mode) : null;
    if (index == null) {
      anchorLock.current = null;
      // Citation introuvable : on reste en haut sans effacer la position sauvée.
      allowSaveRef.current = resume?.mode !== "exact";
      return;
    }
    if (index <= 0) {
      anchorLock.current = null;
      allowSaveRef.current = true;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      return;
    }

    allowSaveRef.current = false;
    anchorLock.current = posts[index].no;
    scrollAnimated.current = false;
    scrollViewPosition.current = 0;
    const key = placeKey;
    placeTimer.current = setTimeout(() => {
      placeTimer.current = null;
      tryScroll(index);
    }, 50);
    giveUpTimer.current = setTimeout(() => {
      giveUpTimer.current = null;
      const locked = anchorLock.current;
      anchorLock.current = null;
      if (locked != null) {
        latestPostNo.current = locked;
        markPositionRef.current(boardRef.current, threadNoRef.current, locked);
      }
      // Le saut n'a pas été confirmé : on n'écrase pas cette position avec
      // le premier post tant que la personne n'a pas scrollé elle-même.
      allowSaveRef.current = false;
      showPlacedRef.current(key);
    }, ANCHOR_GIVE_UP_MS);
  }, [clearAnchorTimers, phase, placeKey, posts, resume, tryScroll]);

  const citedBy = useMemo(() => citedByMap(posts), [posts]);

  const onOpenMedia = useCallback(
    (postNo: number) => {
      const items = galleryItems(board, posts);
      const index = items.findIndex((item) => item.postNo === postNo);
      if (index < 0) return;
      setGallerySession({ items, index });
      router.push(galleryHref());
    },
    [board, posts],
  );

  const onQuote = useCallback(
    (target: QuoteTarget) => {
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
      const threadNo = Number(threadId);
      if (target.kind === "post" || (target.board === board && target.threadId === threadNo)) {
        const focusId = target.kind === "post" ? target.postId : (target.postId ?? target.threadId);
        if (!posts.some((post) => post.no === focusId)) {
          Alert.alert("Quote", "This post is not in this thread.");
          return;
        }
        openQuotes({ board, posts, focusId, threadId: threadNo });
        router.push(quotesHref(0));
        return;
      }
      openQuotes({
        board: target.board,
        threadId: target.threadId,
        focusId: target.postId ?? target.threadId,
      });
      router.push(quotesHref(0));
    },
    [board, posts, threadId],
  );
  const onScrollBeginDrag = useCallback(() => {
    anchorLock.current = null;
    allowSaveRef.current = true;
  }, []);

  const onToggleFavorite = useCallback(() => {
    const source = posts[0];
    if (!source) return;
    void toggleFavorite({
      board,
      threadId: source.no,
      title: threadTitle(source, board),
      thumbnailUrl: thumbnailFor(board, source),
      replyCount: source.replies ?? null,
    });
  }, [board, posts, toggleFavorite]);

  const revealed = !needsAnchor;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={onToggleFavorite}
              hitSlop={8}
              style={{ paddingHorizontal: 4 }}
              disabled={!op}
            >
              <Text style={{ color: favorite ? palette.accent : palette.text, fontWeight: "700" }}>
                {favorite ? "Favorited" : "Favorite"}
              </Text>
            </Pressable>
          ),
        }}
      />
      {phase === "loading" ? <LoadingState label="Loading thread…" /> : null}
      {phase === "error" ? (
        <ErrorState message={banner ?? "Unknown error."} onRetry={() => void load("initial")} />
      ) : null}
      {phase === "ready" ? (
        <View style={styles.body}>
          <ErrorBanner message={banner} />
          <View
            style={revealed ? styles.shown : styles.hidden}
            pointerEvents={revealed ? "auto" : "none"}
            accessibilityElementsHidden={!revealed}
            importantForAccessibility={revealed ? "auto" : "no-hide-descendants"}
          >
            <FlatList
              ref={listRef}
              style={styles.list}
              data={posts}
              keyExtractor={(item) => String(item.no)}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
              onScrollBeginDrag={onScrollBeginDrag}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void load("refresh")}
                  tintColor={palette.accent}
                  colors={[palette.accent]}
                  progressBackgroundColor={palette.surface}
                />
              }
              onScrollToIndexFailed={(info) => {
                scrollRetries.current += 1;
                if (scrollRetries.current >= 16) {
                  showPlacedRef.current(placeKeyRef.current);
                  return;
                }
                const length = info.averageItemLength > 1 ? info.averageItemLength : 280;
                listRef.current?.scrollToOffset({ offset: length * info.index, animated: false });
                const attempt = scrollRetries.current;
                const index = info.index;
                setTimeout(() => {
                  if (!alive.current || scrollRetries.current !== attempt) return;
                  tryScroll(index);
                }, 80);
              }}
              renderItem={({ item, index }) => (
                <PostCard
                  board={board}
                  post={item}
                  op={index === 0}
                  citedBy={citedBy.get(item.no)}
                  onOpenMedia={onOpenMedia}
                  onQuote={onQuote}
                />
              )}
            />
          </View>
          {revealed ? null : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.background }]} pointerEvents="none">
              <LoadingState label="Returning to your post…" />
            </View>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  shown: { flex: 1 },
  hidden: { flex: 1, opacity: 0 },
  list: { flex: 1 },
});
