import { Image } from "expo-image";

import { cacheByteSize } from "@/src/lib/disk";

/** Les miniatures peuvent rester sur le disque. Les images pleines, non. */
export const IMAGE_DISK_CAP = 48 * 1024 * 1024;

/**
 * À poser sur une image pleine (catalogue en grille, post, galerie).
 * La mémoire est vidée par iOS. Rien n'est écrit dans le cache disque.
 */
export const transientImage = "memory" as const;

export function configureImageCache(): void {
  Image.configureCache({
    maxDiskSize: IMAGE_DISK_CAP,
    maxMemoryCost: 64 * 1024 * 1024,
    maxMemoryCount: 24,
  });
  if (cacheByteSize() > IMAGE_DISK_CAP) {
    void Image.clearDiskCache();
  }
}
