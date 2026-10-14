import { File, Paths } from "expo-file-system";
import { requestPermissionsAsync, saveToLibraryAsync } from "expo-media-library/legacy";

export async function downloadToCache(url: string, filename: string): Promise<string> {
  try {
    const destination = new File(Paths.cache, filename);
    const file = await File.downloadFileAsync(url, destination, { idempotent: true });
    return file.uri;
  } catch {
    throw new Error("Impossible de télécharger ce fichier.");
  }
}

/** Écriture seule : Photos n'a pas besoin d'être lue. Le WebM passe par le partage, pas ici. */
export async function saveInPhotoLibrary(localUri: string): Promise<void> {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error("Autorise l'accès à la photothèque pour enregistrer.");
  }
  try {
    await saveToLibraryAsync(localUri);
  } catch {
    throw new Error("Impossible d'enregistrer dans la photothèque.");
  }
}
