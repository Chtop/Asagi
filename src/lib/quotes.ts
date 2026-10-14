import { classifyHref, parseComment } from "@/src/lib/html";
import type { Post } from "@/src/types/fourchan";

/** Numéros cités directement par ce commentaire. Pas les citations de citations. */
export function quotedIdsIn(html: string | undefined): number[] {
  if (!html) return [];
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const segment of parseComment(html)) {
    if (segment.type !== "link" || segment.dead) continue;
    const target = classifyHref(segment.href);
    const id = target?.kind === "post" ? target.postId : target?.kind === "thread" ? target.postId : undefined;
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Pour chaque post du thread, les posts qui le citent, dans l'ordre du thread. */
export function citedByMap(posts: Post[]): Map<number, number[]> {
  const present = new Set(posts.map((post) => post.no));
  const map = new Map<number, number[]>();
  for (const post of posts) {
    for (const id of quotedIdsIn(post.com)) {
      if (id === post.no || !present.has(id)) continue;
      const list = map.get(id);
      if (list) {
        if (!list.includes(post.no)) list.push(post.no);
      } else {
        map.set(id, [post.no]);
      }
    }
  }
  return map;
}

export function directCitations(posts: Post[], focusId: number): { quoted: number[]; replies: number[] } {
  const present = new Set(posts.map((post) => post.no));
  const quotesOf = new Map(posts.map((post) => [post.no, quotedIdsIn(post.com)]));
  const quoted = (quotesOf.get(focusId) ?? []).filter((id) => id !== focusId && present.has(id));
  const replies = posts
    .filter((post) => post.no !== focusId && (quotesOf.get(post.no) ?? []).includes(focusId))
    .map((post) => post.no);
  return { quoted, replies };
}

/** Le post focus, ceux qu'il cite, et ceux qui le citent. Un seul niveau, dans l'ordre du thread. */
export function conversationAround(posts: Post[], focusId: number): Post[] {
  if (!posts.some((post) => post.no === focusId)) return [];
  const { quoted, replies } = directCitations(posts, focusId);
  const wanted = new Set<number>([focusId, ...quoted, ...replies]);
  return posts.filter((post) => wanted.has(post.no));
}
