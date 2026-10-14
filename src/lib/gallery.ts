import { mediaForPost } from "@/src/api/media";
import type { Post } from "@/src/types/fourchan";

export type GalleryItem = {
  postNo: number;
  kind: "image" | "mp4" | "webm";
  url: string;
  thumbUrl: string;
  filename: string;
  board: string;
  originalName: string;
};

function suffixFor(ext: string): string {
  return ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
}

function fileNameFor(post: Post, ext: string): string {
  const suffix = suffixFor(ext);
  const raw = (post.filename ?? "fichier").normalize("NFKD");
  const stem = raw.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 60);
  const trimmed = stem.toLowerCase().endsWith(suffix) ? stem.slice(0, -suffix.length) : stem;
  return `${post.no}-${trimmed || "fichier"}${suffix}`;
}

function displayNameFor(post: Post, ext: string): string {
  const suffix = suffixFor(ext);
  const raw = post.filename?.trim() || "fichier";
  return raw.toLowerCase().endsWith(suffix) ? raw : `${raw}${suffix}`;
}

/** Tous les fichiers visibles du thread, spoilers compris : le swipe parcourt le thread entier. */
export function galleryItems(board: string, posts: Post[]): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const post of posts) {
    const media = mediaForPost(board, post);
    if (media.kind !== "image" && media.kind !== "mp4" && media.kind !== "webm") continue;
    items.push({
      postNo: post.no,
      kind: media.kind,
      url: media.fullUrl,
      thumbUrl: media.thumbUrl,
      filename: fileNameFor(post, media.ext),
      board,
      originalName: displayNameFor(post, media.ext),
    });
  }
  return items;
}
