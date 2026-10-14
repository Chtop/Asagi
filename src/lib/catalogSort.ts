import type { CatalogSort, CatalogView, SortDirection } from "@/src/storage/model";
import type { Post } from "@/src/types/fourchan";

export const CATALOG_SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "bump", label: "Bump" },
  { value: "newest", label: "Récent" },
  { value: "oldest", label: "Ancien" },
  { value: "replies", label: "Réponses" },
  { value: "images", label: "Images" },
];

export const SORT_DIRECTION_OPTIONS: { value: SortDirection; label: string }[] = [
  { value: "desc", label: "Décroissant" },
  { value: "asc", label: "Croissant" },
];

export const CATALOG_VIEW_OPTIONS: { value: CatalogView; label: string }[] = [
  { value: "grid", label: "Grille" },
  { value: "list", label: "Liste" },
];

function rank(post: Post, index: number, mode: CatalogSort): number {
  switch (mode) {
    case "bump":
      return -index;
    case "newest":
      return post.time ?? 0;
    case "oldest":
      return -(post.time ?? 0);
    case "replies":
      return post.replies ?? 0;
    case "images":
      return post.images ?? 0;
  }
}

/** Décroissant met le rang le plus haut en premier : bump d'origine, plus récent, plus cité. */
export function sortCatalog(posts: Post[], mode: CatalogSort, direction: SortDirection): Post[] {
  const decorated = posts.map((post, index) => ({ post, index }));
  decorated.sort((left, right) => {
    const delta = rank(right.post, right.index, mode) - rank(left.post, left.index, mode);
    const ordered = direction === "desc" ? delta : -delta;
    if (ordered !== 0) return ordered;
    return left.index - right.index;
  });
  return decorated.map((item) => item.post);
}
