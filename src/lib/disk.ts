import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";

import { isBoardCode } from "@/src/api/ids";

const SAVED_FOLDER = "asagi-saved";

function savedRoot(): Directory {
  const dir = new Directory(Paths.document, SAVED_FOLDER);
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

/** Dossier du board, ou null si le code ne peut pas servir de chemin. */
export function boardFolderName(board: string | undefined): string | null {
  if (!board) return null;
  const code = board.trim().toLowerCase();
  return isBoardCode(code) ? code : null;
}

function storedName(filename: string): string | null {
  if (!filename || filename.length > 180) return null;
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) return null;
  return filename;
}

export function savedDirectory(board?: string): Directory {
  const root = savedRoot();
  const folder = boardFolderName(board);
  if (!folder) return root;
  const dir = new Directory(root, folder);
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

/**
 * Fichier gardé. Les nouveaux vont dans `asagi-saved/{board}/`.
 * Un fichier déjà enregistré à la racine reste lisible.
 */
export function savedFile(filename: string, board?: string): File {
  const root = savedRoot();
  const name = storedName(filename) ?? "file";
  const legacy = new File(root, name);
  const folder = boardFolderName(board);
  if (!folder) return legacy;
  const dir = new Directory(root, folder);
  const nested = new File(dir, name);
  if (nested.exists) return nested;
  if (legacy.exists) return legacy;
  if (!dir.exists) dir.create({ idempotent: true });
  return nested;
}

/** Déplace les fichiers plats déjà gardés dans le dossier de leur board. */
export async function placeSavedFiles(items: { filename: string; board: string }[]): Promise<void> {
  const root = new Directory(Paths.document, SAVED_FOLDER);
  if (!root.exists) return;
  for (const item of items) {
    const folder = boardFolderName(item.board);
    const name = storedName(item.filename);
    if (!folder || !name) continue;
    const legacy = new File(root, name);
    if (!legacy.exists) continue;
    const dir = new Directory(root, folder);
    if (!dir.exists) dir.create({ idempotent: true });
    const dest = new File(dir, name);
    if (dest.exists) continue;
    try {
      await legacy.move(dest);
    } catch {
      // Le fichier reste à la racine. savedFile le retrouve.
    }
  }
}

function measureDirectory(dir: Directory, depth: number): number {
  if (!dir.exists || depth > 8) return 0;
  let total = 0;
  let entries: (Directory | File)[] = [];
  try {
    entries = dir.list();
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry instanceof Directory) total += measureDirectory(entry, depth + 1);
    else total += entry.size ?? 0;
  }
  return total;
}

/** Taille du cache de l'app, médias gardés exclus : ils sont dans Documents. */
export function cacheByteSize(): number {
  if (!Paths.cache.exists) return 0;
  return measureDirectory(Paths.cache, 0);
}

export async function clearAppCache(): Promise<void> {
  await Image.clearMemoryCache().catch(() => false);
  await Image.clearDiskCache().catch(() => false);
  if (!Paths.cache.exists) return;
  let entries: (Directory | File)[] = [];
  try {
    entries = Paths.cache.list();
  } catch {
    return;
  }
  for (const entry of entries) {
    try {
      entry.delete();
    } catch {
      // Un fichier encore ouvert par le lecteur peut refuser. On continue.
    }
  }
}
