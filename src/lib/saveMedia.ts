import { File, Paths } from "expo-file-system";
import {
  addAssetsToAlbumAsync,
  createAlbumAsync,
  createAssetAsync,
  getAlbumAsync,
  requestPermissionsAsync,
} from "expo-media-library/legacy";

import { isBoardCode } from "@/src/api/ids";

export async function downloadToCache(url: string, filename: string): Promise<string> {
  try {
    const destination = new File(Paths.cache, filename);
    const file = await File.downloadFileAsync(url, destination, { idempotent: true });
    return file.uri;
  } catch {
    throw new Error("Could not download this file.");
  }
}

/** Album Photos du board. Un accès complet est requis pour le créer. */
export function photoAlbumTitle(board: string): string {
  const code = board.trim().toLowerCase();
  return isBoardCode(code) ? `Asagi /${code}/` : "Asagi";
}

let photoGate: Promise<unknown> = Promise.resolve();

/**
 * Enregistre dans l'album du board. Les albums exigent l'accès complet :
 * l'écriture seule dépose tout dans Récents. Le WebM ne passe pas ici.
 */
export function saveInPhotoLibrary(localUri: string, board: string): Promise<string> {
  const run = photoGate.then(() => saveInAlbum(localUri, board));
  photoGate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function saveInAlbum(localUri: string, board: string): Promise<string> {
  const permission = await requestPermissionsAsync(false);
  if (!permission.granted) {
    throw new Error("Allow photo library access to save.");
  }
  if (permission.accessPrivileges && permission.accessPrivileges !== "all") {
    throw new Error("Allow full photo library access in Settings to save into a board album.");
  }
  const title = photoAlbumTitle(board);
  try {
    const asset = await createAssetAsync(localUri);
    const existing = await getAlbumAsync(title);
    if (existing?.id) {
      await addAssetsToAlbumAsync(asset, existing);
    } else {
      await createAlbumAsync(title, asset);
    }
  } catch (error) {
    if (error instanceof Error && /photo library|board album/i.test(error.message)) throw error;
    throw new Error("Could not save to the photo library.");
  }
  return title;
}
