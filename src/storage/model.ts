/**
 * Modèle local, sans dépendance native, pour pouvoir le raisonner à part
 * du pont AsyncStorage. AsyncStorage suffit pour des listes courtes
 * (favoris + historique) et n'ajoute aucun entitlement iOS.
 */

export const HISTORY_LIMIT = 150;

export type ThreadSnapshot = {
  board: string;
  threadId: number;
  title: string;
  thumbnailUrl: string | null;
  replyCount: number | null;
};

export type FavoriteThread = ThreadSnapshot & {
  savedAt: number;
};

export type HistoryEntry = ThreadSnapshot & {
  openedAt: number;
  /**
   * Numéro du post affiché en haut de l'écran.
   * On garde le `no` plutôt que l'index : un nouveau reply ne décale pas
   * le message, et un post supprimé au-dessus non plus.
   */
  lastPostNo: number | null;
};

export type ThemePreference = "system" | "dark" | "light";
export type BoardFilter = "all" | "sfw" | "nsfw";
export type CatalogSort = "bump" | "newest" | "oldest" | "replies" | "images";
export type SortDirection = "asc" | "desc";
export type CatalogView = "grid" | "list";

export type Settings = {
  theme: ThemePreference;
  boardFilter: BoardFilter;
  catalogSort: CatalogSort;
  catalogSortDirection: SortDirection;
  catalogView: CatalogView;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  boardFilter: "all",
  catalogSort: "bump",
  catalogSortDirection: "desc",
  catalogView: "grid",
};

export type SavedMediaKind = "image" | "mp4" | "webm";

export type SavedMedia = {
  id: string;
  filename: string;
  originalName: string;
  kind: SavedMediaKind;
  board: string;
  postNo: number;
  sourceUrl: string;
  savedAt: number;
  bytes: number | null;
};

export function sameThread(left: { board: string; threadId: number }, right: { board: string; threadId: number }): boolean {
  return left.board === right.board && left.threadId === right.threadId;
}

function isSnapshot(value: unknown): value is ThreadSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as ThreadSnapshot;
  return (
    typeof item.board === "string" &&
    typeof item.threadId === "number" &&
    Number.isSafeInteger(item.threadId) &&
    typeof item.title === "string" &&
    (item.thumbnailUrl === null || typeof item.thumbnailUrl === "string") &&
    (item.replyCount === null || typeof item.replyCount === "number")
  );
}

export function parseFavorites(value: unknown): FavoriteThread[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FavoriteThread => {
    return isSnapshot(item) && typeof (item as FavoriteThread).savedAt === "number";
  });
}

function readPostNo(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function parseHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isSnapshot(item) || typeof (item as HistoryEntry).openedAt !== "number") return [];
    const entry = item as Partial<HistoryEntry> & ThreadSnapshot & { openedAt: number };
    return [{ ...entry, lastPostNo: readPostNo(entry.lastPostNo) }];
  });
}

const SORTS: CatalogSort[] = ["bump", "newest", "oldest", "replies", "images"];

export function parseSettings(value: unknown): Settings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
  const raw = value as Partial<Settings>;
  const theme: ThemePreference =
    raw.theme === "light" || raw.theme === "system" || raw.theme === "dark" ? raw.theme : DEFAULT_SETTINGS.theme;
  const boardFilter: BoardFilter =
    raw.boardFilter === "sfw" || raw.boardFilter === "nsfw" || raw.boardFilter === "all"
      ? raw.boardFilter
      : DEFAULT_SETTINGS.boardFilter;
  const catalogSort = SORTS.includes(raw.catalogSort as CatalogSort)
    ? (raw.catalogSort as CatalogSort)
    : DEFAULT_SETTINGS.catalogSort;
  const catalogSortDirection: SortDirection = raw.catalogSortDirection === "asc" ? "asc" : "desc";
  const catalogView: CatalogView = raw.catalogView === "list" ? "list" : "grid";
  return { theme, boardFilter, catalogSort, catalogSortDirection, catalogView };
}

export function parseSavedMedia(value: unknown): SavedMedia[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SavedMedia => {
    if (!item || typeof item !== "object") return false;
    const media = item as SavedMedia;
    return (
      typeof media.id === "string" &&
      typeof media.filename === "string" &&
      typeof media.originalName === "string" &&
      (media.kind === "image" || media.kind === "mp4" || media.kind === "webm") &&
      typeof media.board === "string" &&
      typeof media.postNo === "number" &&
      typeof media.sourceUrl === "string" &&
      typeof media.savedAt === "number" &&
      (media.bytes === null || typeof media.bytes === "number")
    );
  });
}

export function toggleFavoriteList(current: FavoriteThread[], snapshot: ThreadSnapshot): FavoriteThread[] {
  if (current.some((item) => sameThread(item, snapshot))) {
    return current.filter((item) => !sameThread(item, snapshot));
  }
  return [{ ...snapshot, savedAt: Date.now() }, ...current];
}

export function nextHistory(current: HistoryEntry[], snapshot: ThreadSnapshot): HistoryEntry[] {
  const previous = current.find((item) => sameThread(item, snapshot));
  const rest = current.filter((item) => !sameThread(item, snapshot));
  return [
    {
      ...snapshot,
      openedAt: Date.now(),
      lastPostNo: previous?.lastPostNo ?? null,
    },
    ...rest,
  ].slice(0, HISTORY_LIMIT);
}

/** Met à jour la position sans changer l'ordre ni la date d'ouverture. */
export function rememberPosition(
  current: HistoryEntry[],
  board: string,
  threadId: number,
  lastPostNo: number,
): HistoryEntry[] | null {
  if (!Number.isSafeInteger(lastPostNo) || lastPostNo <= 0) return null;
  const index = current.findIndex((item) => sameThread(item, { board, threadId }));
  if (index < 0 || current[index].lastPostNo === lastPostNo) return null;
  const next = current.slice();
  next[index] = { ...next[index], lastPostNo };
  return next;
}

/**
 * Index du post à afficher. `nearest` sert quand le post lu a été supprimé :
 * on prend le suivant, ou le dernier s'il n'y en a plus après.
 */
export function indexForPostNo(postNos: number[], postNo: number, mode: "exact" | "nearest"): number | null {
  const exact = postNos.indexOf(postNo);
  if (exact >= 0) return exact;
  if (mode === "exact" || postNos.length === 0) return null;
  const next = postNos.findIndex((no) => no > postNo);
  if (next >= 0) return next;
  return postNos.length - 1;
}

/** Met à jour le titre et la miniature d'un favori déjà présent, sans changer sa date. */
export function refreshFavorite(current: FavoriteThread[], snapshot: ThreadSnapshot): FavoriteThread[] | null {
  const index = current.findIndex((item) => sameThread(item, snapshot));
  if (index < 0) return null;
  const existing = current[index];
  if (
    existing.title === snapshot.title &&
    existing.thumbnailUrl === snapshot.thumbnailUrl &&
    existing.replyCount === snapshot.replyCount
  ) {
    return null;
  }
  const next = current.slice();
  next[index] = { ...existing, ...snapshot, savedAt: existing.savedAt };
  return next;
}
