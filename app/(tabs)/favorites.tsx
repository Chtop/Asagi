import { router } from "expo-router";
import { FlatList } from "react-native";

import { EmptyState, Screen } from "@/src/components/ui";
import { ThreadLinkRow } from "@/src/components/ThreadLinkRow";
import { threadHref } from "@/src/lib/navigation";
import { useLibrary } from "@/src/state/LibraryContext";

export default function FavoritesScreen() {
  const { favorites, toggleFavorite } = useLibrary();

  return (
    <Screen>
      <FlatList
        data={favorites}
        keyExtractor={(item) => `${item.board}-${item.threadId}`}
        contentContainerStyle={favorites.length === 0 ? { flexGrow: 1 } : undefined}
        renderItem={({ item }) => (
          <ThreadLinkRow
            board={item.board}
            threadId={item.threadId}
            title={item.title}
            thumbnailUrl={item.thumbnailUrl}
            replyCount={item.replyCount}
            at={item.savedAt}
            atLabel="Enregistré"
            onPress={() => router.push(threadHref(item.board, item.threadId))}
            onRemove={() => {
              void toggleFavorite(item);
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Aucun favori"
            detail="Ouvre un thread et appuie sur Favori. La liste reste sur cet appareil."
          />
        }
      />
    </Screen>
  );
}
