import { htmlToPlain } from "@/src/lib/html";

export function threadTitle(post: { no: number; sub?: string; com?: string }, board: string): string {
  const subject = post.sub ? htmlToPlain(post.sub) : "";
  if (subject) return subject.slice(0, 180);
  const body = post.com ? htmlToPlain(post.com) : "";
  const line = body
    .split("\n")
    .map((item) => item.trim())
    .find(Boolean);
  if (line) return line.slice(0, 180);
  return `/${board}/${post.no}`;
}

export function replySummary(replies?: number, images?: number): string {
  const replyCount = replies ?? 0;
  const imageCount = images ?? 0;
  const replyLabel = replyCount === 1 ? "1 réponse" : `${replyCount} réponses`;
  const imageLabel = imageCount === 1 ? "1 image" : `${imageCount} images`;
  return `${replyLabel} · ${imageLabel}`;
}

export function formatBytes(bytes?: number): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatWhen(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatPostTime(unixSeconds?: number): string {
  if (unixSeconds == null) return "";
  return formatWhen(unixSeconds * 1000);
}
