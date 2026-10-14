import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";

import { fetchCatalog } from "@/src/api/fourchan";
import { isBoardCode } from "@/src/api/ids";
import { CatalogCard } from "@/src/components/CatalogCard";
import { EmptyState, ErrorBanner, ErrorState, LoadingState, Screen } from "@/src/components/ui";
import { threadHref } from "@/src/lib/navigation";
import { one } from "@/src/lib/route";
import { htmlToPlain } from "@/src/lib/html";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Post } from "@/src/types/fourchan";

type Cell = { key: string; post: Post | null };

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ board: string; title?: string }>();
  const board = one(params.board).toLowerCase();
  const title = htmlToPlain(one(params.title)) || `/${board}/`;
  const { palette } = useAppTheme();
  const [threads, setThreads] = useState<Post[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const hasData = useRef(false);

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
    void load("initial");
  }, [load]);

  const cells = useMemo<Cell[]>(() => {
    const next: Cell[] = threads.map((post) => ({ key: `${board}-${post.no}`, post }));
    if (next.length % 2 === 1) next.push({ key: `${board}-spacer`, post: null });
    return next;
  }, [board, threads]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text style={{ color: palette.text, fontWeight: "700", fontSize: 16 }}>/{board}/</Text>
              <Text numberOfLines={1} style={{ color: palette.textMuted, fontSize: 12, maxWidth: 220 }}>
                {title}
              </Text>
            </View>
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
          <FlatList
            data={cells}
            keyExtractor={(item) => item.key}
            numColumns={2}
            columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
            contentContainerStyle={{ padding: 12, flexGrow: 1 }}
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
                  onPress={() => router.push(threadHref(board, item.post!.no))}
                />
              ) : (
                <View style={{ flex: 1 }} />
              )
            }
            ListEmptyComponent={<EmptyState title="Catalog vide" detail="Aucun thread sur ce board pour le moment." />}
          />
        </>
      ) : null}
    </Screen>
  );
}
