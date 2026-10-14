import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchCatalog } from "@/src/api/fourchan";
import { isBoardCode } from "@/src/api/ids";
import { CatalogCard } from "@/src/components/CatalogCard";
import { EmptyState, ErrorBanner, ErrorState, FilterChips, LoadingState, Screen } from "@/src/components/ui";
import { CATALOG_SORT_OPTIONS, SORT_DIRECTION_OPTIONS, sortCatalog } from "@/src/lib/catalogSort";
import { threadTitle } from "@/src/lib/format";
import { htmlToPlain } from "@/src/lib/html";
import { threadHref } from "@/src/lib/navigation";
import { one } from "@/src/lib/route";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { CatalogSort, SortDirection } from "@/src/storage/model";
import type { Post } from "@/src/types/fourchan";

type Cell = { key: string; post: Post | null };

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ board: string; title?: string }>();
  const board = one(params.board).toLowerCase();
  const title = htmlToPlain(one(params.title)) || `/${board}/`;
  const { palette, settings, setCatalogView } = useAppTheme();
  const [threads, setThreads] = useState<Post[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CatalogSort>(settings.catalogSort);
  const [direction, setDirection] = useState<SortDirection>(settings.catalogSortDirection);
  const hasData = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!isBoardCode(board)) {
        setBanner("Code de board invalide.");
        setPhase("error");
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setPhase("loading");
      try {
        const next = await fetchCatalog(board);
        hasData.current = true;
        setThreads(next);
        setPhase("ready");
        setBanner(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue.";
        if (mode === "refresh" && hasData.current) setBanner(message);
        else {
          setBanner(message);
          setPhase("error");
        }
      } finally {
        setRefreshing(false);
      }
    },
    [board],
  );

  useEffect(() => {
    hasData.current = false;
    setQuery("");
    setSort(settingsRef.current.catalogSort);
    setDirection(settingsRef.current.catalogSortDirection);
    void load("initial");
  }, [load]);

  const view = settings.catalogView;

  const ordered = useMemo(() => sortCatalog(threads, sort, direction), [threads, sort, direction]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return ordered;
    return ordered.filter((post) => {
      const body = post.com ? htmlToPlain(post.com) : "";
      const haystack = [threadTitle(post, board), body, post.filename ?? "", String(post.no)].join("\n").toLowerCase();
      return haystack.includes(needle);
    });
  }, [board, ordered, query]);

  const cells = useMemo<Cell[]>(() => {
    const next: Cell[] = visible.map((post) => ({ key: `${board}-${post.no}`, post }));
    if (view === "grid" && next.length % 2 === 1) next.push({ key: `${board}-spacer`, post: null });
    return next;
  }, [board, view, visible]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text style={{ color: palette.text, fontWeight: "700", fontSize: 16 }}>/{board}/</Text>
              <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 12, maxWidth: 180 }}>
                {title}
              </Text>
            </View>
          ),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={view === "grid" ? "Afficher en liste" : "Afficher en grille"}
              hitSlop={8}
              onPress={() => setCatalogView(view === "grid" ? "list" : "grid")}
              style={styles.viewToggle}
            >
              <Text style={{ color: palette.accent, fontWeight: "700" }}>{view === "grid" ? "Liste" : "Grille"}</Text>
            </Pressable>
          ),
        }}
      />
      {phase === "loading" ? <LoadingState label={`Catalog /${board}/…`} /> : null}
      {phase === "error" ? (
        <ErrorState message={banner ?? "Erreur inconnue."} onRetry={() => void load("initial")} />
      ) : null}
      {phase === "ready" ? (
        <>
          <ErrorBanner message={banner} />
          <View style={styles.tools}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Titre, texte ou numéro"
              placeholderTextColor={palette.textMuted}
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
              style={[styles.search, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
            />
            <FilterChips options={CATALOG_SORT_OPTIONS} value={sort} onChange={setSort} />
            <FilterChips options={SORT_DIRECTION_OPTIONS} value={direction} onChange={setDirection} />
          </View>
          <FlatList
            key={view}
            style={styles.list}
            data={cells}
            keyExtractor={(item) => item.key}
            numColumns={view === "list" ? 1 : 2}
            columnWrapperStyle={view === "list" ? undefined : { gap: 10, marginBottom: 10 }}
            ItemSeparatorComponent={view === "list" ? ListGap : undefined}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load("refresh")}
                tintColor={palette.accent}
                colors={[palette.accent]}
                progressBackgroundColor={palette.surface}
              />
            }
            renderItem={({ item }) =>
              item.post ? (
                <CatalogCard
                  board={board}
                  post={item.post}
                  layout={view}
                  onPress={() => router.push(threadHref(board, item.post!.no))}
                />
              ) : (
                <View style={styles.spacer} />
              )
            }
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <EmptyState
                title={query.trim() ? "Aucun résultat" : "Catalog vide"}
                detail={
                  query.trim()
                    ? "Aucun thread pour cette recherche."
                    : "Aucun thread sur ce board pour le moment."
                }
              />
            }
          />
        </>
      ) : null}
    </Screen>
  );
}

function ListGap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  tools: { paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  content: { padding: 12, flexGrow: 1 },
  spacer: { flex: 1 },
  gap: { height: 10 },
  viewToggle: { paddingHorizontal: 4 },
});
