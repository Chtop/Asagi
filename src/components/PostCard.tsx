import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CommentBody } from "@/src/components/CommentBody";
import { MediaBlock } from "@/src/components/MediaBlock";
import { formatPostTime } from "@/src/lib/format";
import { htmlToPlain, type QuoteTarget } from "@/src/lib/html";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Post } from "@/src/types/fourchan";

const NO_CITATIONS: number[] = [];

function PostCardComponent({
  board,
  post,
  op,
  highlight = false,
  citedBy = NO_CITATIONS,
  onOpenMedia,
  onQuote,
  onOpenReplies,
}: {
  board: string;
  post: Post;
  op: boolean;
  highlight?: boolean;
  citedBy?: number[];
  onOpenMedia: (postNo: number) => void;
  onQuote: (target: QuoteTarget) => void;
  onOpenReplies: (postNo: number) => void;
}) {
  const { palette } = useAppTheme();
  const subject = post.sub ? htmlToPlain(post.sub) : "";
  const name = post.name?.trim() || "Anonymous";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: highlight ? palette.accent : palette.border,
          borderWidth: highlight ? 2 : StyleSheet.hairlineWidth,
          borderLeftColor: highlight || op ? palette.accent : palette.border,
          borderLeftWidth: highlight ? 2 : op ? 3 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.head}>
        <Text selectable style={[styles.name, { color: palette.text }]}>
          {name}
          {post.trip ? <Text style={{ color: palette.textMuted }}>{` ${post.trip}`}</Text> : null}
        </Text>
        <Text selectable style={[styles.time, { color: palette.textMuted }]}>{formatPostTime(post.time)}</Text>
      </View>
      <Text selectable style={[styles.no, { color: palette.textMuted }]}>
        #{post.no}
        {post.capcode ? ` · ${post.capcode}` : ""}
        {op ? " · OP" : ""}
      </Text>
      {subject ? <Text selectable style={[styles.subject, { color: palette.text }]}>{subject}</Text> : null}
      <MediaBlock board={board} post={post} onOpen={() => onOpenMedia(post.no)} />
      <CommentBody html={post.com} onQuote={onQuote} />
      {citedBy.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={citedBy.length === 1 ? "1 reply" : `${citedBy.length} replies`}
          onPress={() => onOpenReplies(post.no)}
          hitSlop={6}
        >
          <Text style={[styles.cited, { color: palette.quoteLink }]}>
            {citedBy.length === 1 ? "1 reply" : `${citedBy.length} replies`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const PostCard = memo(PostCardComponent);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  head: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  name: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  time: { fontSize: 12 },
  no: { fontSize: 12, fontVariant: ["tabular-nums"] },
  subject: { fontSize: 16, fontWeight: "700" },
  cited: { fontSize: 14, lineHeight: 20 },
});
