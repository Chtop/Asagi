import type { GalleryItem } from "@/src/lib/gallery";

type GallerySession = {
  items: GalleryItem[];
  index: number;
};

let current: GallerySession | null = null;

export function setGallerySession(session: GallerySession): void {
  if (session.items.length === 0) {
    current = null;
    return;
  }
  const index = Math.max(0, Math.min(session.index, session.items.length - 1));
  current = { items: session.items, index };
}

export function readGallerySession(): GallerySession | null {
  return current;
}
