import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CommentBody } from "@/src/components/CommentBody";
import { MediaBlock } from "@/src/components/MediaBlock";
import { formatPostTime } from "@/src/lib/format";
import { htmlToPlain, type QuoteTarget } from "@/src/lib/html";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { Post } from "@/src/types/fourchan";

function PostCardComponent({
  board,
  post,
  op,
  playing,
  onPlay,
  onStop,
  onOpenImage,
  onQuote,
}: {
  board: string;
  post: Post;
  op: boolean;
  playing: boolean;
  onPlay: (key: string) => void;
  onStop: () => void;
  onOpenImage: (uri: string) => void;
  onQuote: (target: QuoteTarget) => void;
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
          borderColor: palette.border,
          borderLeftColor: op ? palette.accent : palette.border,
          borderLeftWidth: op ? 3 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.head}>
        <Text style={[styles.name, { color: palette.text }]}>
          {name}
          {post.trip ? <Text style={{ color: palette.textMuted }}>{` ${post.trip}`}</Text> : null}
        </Text>
        <Text style={[styles.time, { color: palette.textMuted }]}>{formatPostTime(post.time)}</Text>
      </View>
      <Text style={[styles.no, { color: palette.textMuted }]}>
        #{post.no}
        {post.capcode ? ` · ${post.capcode}` : ""}
        {op ? " · OP" : ""}
      </Text>
      {subject ? <Text style={[styles.subject, { color: palette.text }]}>{subject}</Text> : null}
      <CommentBody html={post.com} onQuote={onQuote} />
      <MediaBlock
        board={board}
        post={post}
        playing={playing}
        onPlay={() => onPlay(String(post.no))}
        onStop={onStop}
        onOpenImage={onOpenImage}
      />
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
});
