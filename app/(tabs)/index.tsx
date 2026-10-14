import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { fetchBoards } from "@/src/api/fourchan";
import { BoardRow } from "@/src/components/BoardRow";
import { EmptyState, ErrorBanner, ErrorState, FilterChips, LoadingState, Screen } from "@/src/components/ui";
import { parseChanLink } from "@/src/lib/chanLink";
import { boardHref, threadHref } from "@/src/lib/navigation";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { BoardFilter } from "@/src/storage/model";
import type { Board } from "@/src/types/fourchan";

const FILTERS: { value: BoardFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "sfw", label: "Worksafe" },
  { value: "nsfw", label: "NSFW" },
];

export default function BoardsScreen() {
  const { palette, settings, setBoardFilter } = useAppTheme();
  const [boards, setBoards] = useState<Board[]>([]);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const hasData = useRef(false);

  const openParsedLink = (raw: string) => {
    const parsed = parseChanLink(raw);
    if (!parsed) {
      Alert.alert("Lien", "Ce lien n'est pas reconnu.");
      return;
    }
    setLinkDraft(null);
    if (parsed.kind === "board") {
      router.push(boardHref(parsed.board, `/${parsed.board}/`));
      return;
    }
    router.push(threadHref(parsed.board, parsed.threadId, parsed.postId));
  };

  const onOpenLink = () => {
    if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
      Alert.prompt(
        "Ouvrir un lien",
        "Colle une adresse de board ou de thread.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Ouvrir", onPress: (value?: string) => openParsedLink(value ?? "") },
        ],
        "plain-text",
      );
      return;
    }
    setLinkDraft("");
  };

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "refresh") setRefreshing(true);
    else setPhase("loading");
    try {
      const next = await fetchBoards();
      hasData.current = true;
      setBoards(next);
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
  }, []);

  useEffect(() => {
    void load("initial");
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return boards.filter((board) => {
      if (settings.boardFilter === "sfw" && board.ws_board !== 1) return false;
      if (settings.boardFilter === "nsfw" && board.ws_board !== 0) return false;
      if (!needle) return true;
      return board.board.includes(needle) || board.title.toLowerCase().includes(needle);
    });
  }, [boards, query, settings.boardFilter]);

  if (phase === "loading") {
    return (
      <Screen>
        <LoadingState label="Chargement des boards…" />
      </Screen>
    );
  }

  if (phase === "error") {
    return (
      <Screen>
        <ErrorState message={banner ?? "Erreur inconnue."} onRetry={() => void load("initial")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.toolbar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un board"
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          style={[
            styles.search,
            { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        />
        <FilterChips options={FILTERS} value={settings.boardFilter} onChange={setBoardFilter} />
        <Pressable
          accessibilityRole="button"
          onPress={onOpenLink}
          style={[styles.linkButton, { borderColor: palette.border, backgroundColor: palette.surface }]}
        >
          <Text style={{ color: palette.accent, fontWeight: "700" }}>Ouvrir un lien</Text>
        </Pressable>
        {linkDraft != null ? (
          <View style={styles.linkRow}>
            <TextInput
              value={linkDraft}
              onChangeText={setLinkDraft}
              placeholder="boards.4chan.org/…/thread/…"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={[
                styles.search,
                styles.linkField,
                { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            />
            <Pressable accessibilityRole="button" onPress={() => openParsedLink(linkDraft)} style={styles.linkGo}>
              <Text style={{ color: palette.accent, fontWeight: "700" }}>Ouvrir</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{visible.length} boards</Text>
      </View>
      <ErrorBanner message={banner} />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.board}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load("refresh")}
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
          />
        }
        renderItem={({ item }) => (
          <BoardRow board={item} onPress={() => router.push(boardHref(item.board, item.title))} />
        )}
        ListEmptyComponent={
          <EmptyState title="Aucun board" detail="Rien ne correspond à cette recherche ou à ce filtre." />
        }
        contentContainerStyle={visible.length === 0 ? styles.empty : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  linkButton: {
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  linkField: { flex: 1 },
  linkGo: { paddingHorizontal: 4, paddingVertical: 8 },
  empty: { flexGrow: 1 },
});
