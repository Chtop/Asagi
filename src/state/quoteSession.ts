import type { Post } from "@/src/types/fourchan";

export type QuoteView = "conversation" | "replies";

export type QuoteFrame = {
  board: string;
  focusId: number;
  threadId: number;
  posts?: Post[];
  /** conversation : clic sur un >>numéro. replies : le bouton « N replies ». */
  view?: QuoteView;
  /** Change à chaque écriture, pour qu'un écran réutilisé relise le bon fil. */
  revision: number;
};

type QuoteInput = Omit<QuoteFrame, "revision">;

let frames: QuoteFrame[] = [];
let revision = 0;

function stamp(frame: QuoteInput): QuoteFrame {
  revision += 1;
  return { ...frame, revision };
}

/** Remplace la pile. Le thread ouvre toujours le niveau 0. */
export function openQuotes(frame: QuoteInput): void {
  frames = [stamp(frame)];
}

/**
 * Coupe les niveaux au-dessus de celui qui est affiché, puis ajoute le suivant.
 * Le numéro renvoyé est celui de la route à pousser.
 */
export function pushQuoteFrame(frame: QuoteInput, fromLevel: number): number {
  const base = fromLevel >= 0 ? fromLevel + 1 : 0;
  frames = frames.slice(0, base);
  frames.push(stamp(frame));
  return frames.length - 1;
}

export function readQuoteFrame(level: number): QuoteFrame | null {
  return frames[level] ?? null;
}

export function storeQuotePosts(level: number, posts: Post[]): void {
  const frame = frames[level];
  if (!frame) return;
  frames[level] = stamp({ ...frame, posts });
}
