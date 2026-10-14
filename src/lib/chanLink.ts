import { isBoardCode, parseThreadId } from "@/src/api/ids";

export type ChanLink =
  | { kind: "board"; board: string }
  | { kind: "thread"; board: string; threadId: number; postId?: number };

function postIdFrom(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const id = parseThreadId(value);
  return id ?? undefined;
}

/** Lien boards.4chan.org ou boards.4channel.org, même collé au milieu d'une phrase. */
export function parseChanLink(raw: string): ChanLink | null {
  const value = raw.trim();
  if (!value || /^(javascript|data|vbscript):/i.test(value)) return null;

  const thread = /boards\.4chan(?:nel)?\.org\/([a-z0-9]{1,8})\/thread\/(\d+)(?:\/[^\s#]*)?(?:#p(\d+))?/i.exec(value);
  if (thread) {
    const board = thread[1].toLowerCase();
    const threadId = parseThreadId(thread[2]);
    if (!isBoardCode(board) || threadId == null) return null;
    return { kind: "thread", board, threadId, postId: postIdFrom(thread[3]) };
  }

  const bare = /(?:^|\s)\/([a-z0-9]{1,8})\/thread\/(\d+)(?:#p(\d+))?(?:\s|$)/i.exec(` ${value} `);
  if (bare && !/4cdn\.org/i.test(value)) {
    const board = bare[1].toLowerCase();
    const threadId = parseThreadId(bare[2]);
    if (isBoardCode(board) && threadId != null) {
      return { kind: "thread", board, threadId, postId: postIdFrom(bare[3]) };
    }
  }

  const boardOnly = /boards\.4chan(?:nel)?\.org\/([a-z0-9]{1,8})\/?(?:\s|$|[?#])/i.exec(`${value} `);
  if (boardOnly) {
    const board = boardOnly[1].toLowerCase();
    if (!isBoardCode(board) || board === "thread") return null;
    return { kind: "board", board };
  }

  return null;
}
