import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";

const SAVED_FOLDER = "asagi-saved";

export function savedDirectory(): Directory {
  const dir = new Directory(Paths.document, SAVED_FOLDER);
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

export function savedFile(filename: string): File {
  return new File(savedDirectory(), filename);
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
