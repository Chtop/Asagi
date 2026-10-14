import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  parseFavorites,
  parseHistory,
  parseSavedMedia,
  parseSettings,
  type FavoriteThread,
  type HistoryEntry,
  type SavedMedia,
  type Settings,
} from "@/src/storage/model";

const KEYS = {
  favorites: "asagi.favorites.v1",
  history: "asagi.history.v1",
  settings: "asagi.settings.v1",
  savedMedia: "asagi.saved-media.v1",
} as const;

async function readRaw(key: string): Promise<unknown> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
}

export async function loadFavorites(): Promise<FavoriteThread[]> {
  try {
    return parseFavorites(await readRaw(KEYS.favorites));
  } catch {
    return [];
  }
}

export async function saveFavorites(items: FavoriteThread[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.favorites, JSON.stringify(items));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return parseHistory(await readRaw(KEYS.history));
  } catch {
    return [];
  }
}

export async function saveHistory(items: HistoryEntry[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.history, JSON.stringify(items));
}

export async function loadSettings(): Promise<Settings> {
  try {
    return parseSettings(await readRaw(KEYS.settings));
  } catch {
    return parseSettings(null);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

export async function loadSavedMedia(): Promise<SavedMedia[]> {
  try {
    return parseSavedMedia(await readRaw(KEYS.savedMedia));
  } catch {
    return [];
  }
}

export async function saveSavedMedia(items: SavedMedia[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.savedMedia, JSON.stringify(items));
}
