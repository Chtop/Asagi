import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert } from "react-native";

import {
  nextHistory,
  refreshFavorite,
  rememberPosition,
  sameThread,
  toggleFavoriteList,
  type FavoriteThread,
  type HistoryEntry,
  type ThreadSnapshot,
} from "@/src/storage/model";
import { loadFavorites, loadHistory, saveFavorites, saveHistory } from "@/src/storage/persist";

type LibraryContextValue = {
  ready: boolean;
  favorites: FavoriteThread[];
  history: HistoryEntry[];
  isFavorite: (board: string, threadId: number) => boolean;
  toggleFavorite: (snapshot: ThreadSnapshot) => Promise<void>;
  remember: (snapshot: ThreadSnapshot) => Promise<void>;
  positionFor: (board: string, threadId: number) => number | null;
  markPosition: (board: string, threadId: number, postNo: number) => void;
  removeHistory: (board: string, threadId: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  clearFavorites: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteThread[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const favoritesRef = useRef(favorites);
  const historyRef = useRef(history);
  const favoritesWrite = useRef<Promise<void>>(Promise.resolve());
  const historyWrite = useRef<Promise<void>>(Promise.resolve());
  const pendingPosition = useRef<{ board: string; threadId: number; postNo: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadFavorites(), loadHistory()])
      .then(([storedFavorites, storedHistory]) => {
        if (cancelled) return;
        favoritesRef.current = storedFavorites;
        historyRef.current = storedHistory;
        setFavorites(storedFavorites);
        setHistory(storedHistory);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const commitFavorites = useCallback(async (next: FavoriteThread[]) => {
    favoritesRef.current = next;
    setFavorites(next);
    // Les écritures sont en série et relisent la liste courante, pour qu'un
    // second tap ne soit pas écrasé par la sauvegarde du premier.
    const job = favoritesWrite.current.then(async () => {
      try {
        await saveFavorites(favoritesRef.current);
      } catch {
        Alert.alert("Storage", "Could not save favorites on this device.");
      }
    });
    favoritesWrite.current = job.then(
      () => undefined,
      () => undefined,
    );
    await job;
  }, []);

  const commitHistory = useCallback(async (next: HistoryEntry[]) => {
    historyRef.current = next;
    setHistory(next);
    const job = historyWrite.current.then(async () => {
      try {
        await saveHistory(historyRef.current);
      } catch {
        Alert.alert("Storage", "Could not save history on this device.");
      }
    });
    historyWrite.current = job.then(
      () => undefined,
      () => undefined,
    );
    await job;
  }, []);

  const isFavorite = useCallback((board: string, threadId: number) => {
    return favorites.some((item) => sameThread(item, { board, threadId }));
  }, [favorites]);

  const toggleFavorite = useCallback(
    async (snapshot: ThreadSnapshot) => {
      await commitFavorites(toggleFavoriteList(favoritesRef.current, snapshot));
    },
    [commitFavorites],
  );

  const remember = useCallback(
    async (snapshot: ThreadSnapshot) => {
      let list = nextHistory(historyRef.current, snapshot);
      const pending = pendingPosition.current;
      if (pending && sameThread(pending, snapshot)) {
        list = rememberPosition(list, pending.board, pending.threadId, pending.postNo) ?? list;
        pendingPosition.current = null;
      }
      await commitHistory(list);
      const refreshed = refreshFavorite(favoritesRef.current, snapshot);
      if (refreshed) await commitFavorites(refreshed);
    },
    [commitFavorites, commitHistory],
  );

  const positionFor = useCallback((board: string, threadId: number) => {
    return historyRef.current.find((item) => sameThread(item, { board, threadId }))?.lastPostNo ?? null;
  }, []);

  const markPosition = useCallback(
    (board: string, threadId: number, postNo: number) => {
      const next = rememberPosition(historyRef.current, board, threadId, postNo);
      if (next) {
        pendingPosition.current = null;
        void commitHistory(next);
        return;
      }
      const known = historyRef.current.some((item) => sameThread(item, { board, threadId }));
      if (!known) pendingPosition.current = { board, threadId, postNo };
    },
    [commitHistory],
  );

  const removeHistory = useCallback(
    async (board: string, threadId: number) => {
      if (pendingPosition.current && sameThread(pendingPosition.current, { board, threadId })) {
        pendingPosition.current = null;
      }
      await commitHistory(historyRef.current.filter((item) => !sameThread(item, { board, threadId })));
    },
    [commitHistory],
  );

  const clearHistory = useCallback(async () => {
    pendingPosition.current = null;
    await commitHistory([]);
  }, [commitHistory]);

  const clearFavorites = useCallback(async () => {
    await commitFavorites([]);
  }, [commitFavorites]);

  const value = useMemo(
    () => ({
      ready,
      favorites,
      history,
      isFavorite,
      toggleFavorite,
      remember,
      positionFor,
      markPosition,
      removeHistory,
      clearHistory,
      clearFavorites,
    }),
    [
      ready,
      favorites,
      history,
      isFavorite,
      toggleFavorite,
      remember,
      positionFor,
      markPosition,
      removeHistory,
      clearHistory,
      clearFavorites,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider.");
  return value;
}
