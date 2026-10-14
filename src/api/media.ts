import { MEDIA_ORIGIN } from "@/src/config";
import { isBoardCode } from "@/src/api/ids";
import type { Post } from "@/src/types/fourchan";

/**
 * Le MP4 passe par AVPlayer (expo-video).
 * Le WebM, format le plus courant, passe par LibVLC : AVPlayer ne le décode pas.
 */

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

export type VisualMedia = {
  kind: "image" | "mp4" | "webm";
  thumbUrl: string;
  fullUrl: string;
  ext: string;
  spoiler: boolean;
  width?: number;
  height?: number;
  bytes?: number;
};

export type MediaInfo = { kind: "none" } | { kind: "deleted" } | { kind: "unknown"; ext: string } | VisualMedia;

const EXT_RE = /^\.[a-z0-9]{2,5}$/;

export function mediaForPost(board: string, post: Post): MediaInfo {
  if (!isBoardCode(board)) return { kind: "none" };
  if (post.filedeleted === 1) return { kind: "deleted" };
  if (post.tim == null || !post.ext) return { kind: "none" };
  if (!Number.isSafeInteger(post.tim) || post.tim <= 0) return { kind: "none" };

  const ext = post.ext.toLowerCase();
  if (!EXT_RE.test(ext)) return { kind: "unknown", ext: post.ext };

  const thumbUrl = `${MEDIA_ORIGIN}/${board}/${post.tim}s.jpg`;
  const fullUrl = `${MEDIA_ORIGIN}/${board}/${post.tim}${ext}`;
  const base = {
    thumbUrl,
    fullUrl,
    ext,
    spoiler: post.spoiler === 1,
    width: post.w,
    height: post.h,
    bytes: post.fsize,
  };

  if (ext === ".webm") return { kind: "webm", ...base };
  if (ext === ".mp4") return { kind: "mp4", ...base };
  if (IMAGE_EXT.has(ext)) return { kind: "image", ...base };
  return { kind: "unknown", ext };
}

export function thumbnailFor(board: string, post: Post): string | null {
  const media = mediaForPost(board, post);
  if (media.kind === "none" || media.kind === "deleted" || media.kind === "unknown") return null;
  if (media.spoiler) return null;
  return media.thumbUrl;
}

/** Image pleine pour les aperçus. La vidéo n'a pas de fichier fixe : on garde la miniature. */
export function previewFor(board: string, post: Post): string | null {
  const media = mediaForPost(board, post);
  if (media.kind === "none" || media.kind === "deleted" || media.kind === "unknown") return null;
  if (media.spoiler) return null;
  if (media.kind === "image") return media.fullUrl;
  return media.thumbUrl;
}
