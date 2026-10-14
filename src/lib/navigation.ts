import type { Href } from "expo-router";

/**
 * Les routes typées d'Expo Router ne sont générées qu'au lancement de Metro.
 * Le cast unique ici évite de le répéter dans chaque écran.
 */
export function boardHref(board: string, title: string): Href {
  return { pathname: "/board/[board]", params: { board, title } } as Href;
}

export function threadHref(board: string, threadId: number, focus?: number): Href {
  return {
    pathname: "/thread/[board]/[threadId]",
    params: {
      board,
      threadId: String(threadId),
      focus: focus ? String(focus) : "",
    },
  } as Href;
}

export function galleryHref(): Href {
  return "/gallery" as Href;
}

export function quotesHref(level = 0): Href {
  return { pathname: "/quotes/[level]", params: { level: String(level) } } as Href;
}
