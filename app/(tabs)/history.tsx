import { router } from "expo-router";
import { FlatList } from "react-native";

import { EmptyState, Screen } from "@/src/components/ui";
import { ThreadLinkRow } from "@/src/components/ThreadLinkRow";
import { threadHref } from "@/src/lib/navigation";
import { useLibrary } from "@/src/state/LibraryContext";

export default function HistoryScreen() {
  const { history, removeHistory } = useLibrary();

  return (
    <Screen>
      <FlatList
        data={history}
        keyExtractor={(item) => `${item.board}-${item.threadId}`}
        contentContainerStyle={history.length === 0 ? { flexGrow: 1 } : undefined}
        renderItem={({ item }) => (
          <ThreadLinkRow
            board={item.board}
            threadId={item.threadId}
            title={item.title}
            thumbnailUrl={item.thumbnailUrl}
            replyCount={item.replyCount}
            at={item.openedAt}
            atLabel="Opened"
            onPress={() => router.push(threadHref(item.board, item.threadId))}
            onRemove={() => {
              void removeHistory(item.board, item.threadId);
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState title="No history" detail="Threads you open show up here, newest first." />
        }
      />
    </Screen>
  );
}
