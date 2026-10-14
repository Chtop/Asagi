import type { Post } from "@/src/types/fourchan";

export type QuoteSession = {
  board: string;
  focusId: number;
  threadId: number;
  posts?: Post[];
};

let current: QuoteSession | null = null;

export function setQuoteSession(session: QuoteSession): void {
  current = session;
}

export function readQuoteSession(): QuoteSession | null {
  return current;
}
