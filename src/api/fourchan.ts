import { getJson } from "@/src/api/client";
import { isBoardCode, parseThreadId } from "@/src/api/ids";
import type { Board, BoardsResponse, CatalogPage, Post, ThreadResponse } from "@/src/types/fourchan";

function isBoard(value: unknown): value is Board {
  if (!value || typeof value !== "object") return false;
  const board = value as Board;
  return (
    typeof board.board === "string" &&
    isBoardCode(board.board) &&
    typeof board.title === "string" &&
    (board.ws_board === 0 || board.ws_board === 1)
  );
}

function isPost(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Post).no === "number";
}

export async function fetchBoards(): Promise<Board[]> {
  const payload = await getJson<BoardsResponse>("/boards.json");
  const boards = Array.isArray(payload?.boards) ? payload.boards : [];
  return boards.filter(isBoard);
}

export async function fetchCatalog(board: string): Promise<Post[]> {
  if (!isBoardCode(board)) throw new Error("Code de board invalide.");
  const pages = await getJson<CatalogPage[]>(`/${board}/catalog.json`);
  if (!Array.isArray(pages)) return [];
  return pages.flatMap((page) => (Array.isArray(page?.threads) ? page.threads.filter(isPost) : []));
}

export async function fetchThread(board: string, threadId: string): Promise<Post[]> {
  const id = parseThreadId(threadId);
  if (!isBoardCode(board) || id == null) throw new Error("Adresse de thread invalide.");
  const payload = await getJson<ThreadResponse>(`/${board}/thread/${id}.json`);
  const posts = Array.isArray(payload?.posts) ? payload.posts.filter(isPost) : [];
  return posts;
}
