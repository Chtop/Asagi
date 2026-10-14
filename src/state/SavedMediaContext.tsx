import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { File } from "expo-file-system";
import { Alert, Share } from "react-native";

import { placeSavedFiles, savedFile } from "@/src/lib/disk";
import { loadSavedMedia, saveSavedMedia } from "@/src/storage/persist";
import type { SavedMedia, SavedMediaKind } from "@/src/storage/model";

type KeepInput = {
  url: string;
  filename: string;
  originalName: string;
  kind: SavedMediaKind;
  board: string;
  postNo: number;
};

type SavedMediaContextValue = {
  ready: boolean;
  items: SavedMedia[];
  keep: (input: KeepInput) => Promise<"saved" | "exists">;
  remove: (id: string) => Promise<void>;
  share: (item: SavedMedia) => Promise<void>;
};

const SavedMediaContext = createContext<SavedMediaContextValue | null>(null);

function safeFileName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(0, 80);
  return cleaned || "file";
}

function dropFile(id: string, board?: string) {
  try {
    const leftover = savedFile(id, board);
    if (leftover.exists) leftover.delete();
  } catch {
    // Un fichier déjà absent ne bloque pas la liste.
  }
}

export function SavedMediaProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedMedia[]>([]);
  const [ready, setReady] = useState(false);
  const itemsRef = useRef(items);
  const write = useRef<Promise<void>>(Promise.resolve());
  const keepGate = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    loadSavedMedia()
      .then(async (stored) => {
        if (cancelled) return;
        await placeSavedFiles(stored);
        if (cancelled) return;
        itemsRef.current = stored;
        setItems(stored);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(async (next: SavedMedia[]) => {
    itemsRef.current = next;
    setItems(next);
    const job = write.current.then(async () => {
      try {
        await saveSavedMedia(itemsRef.current);
      } catch {
        Alert.alert("Storage", "Could not save the media list.");
      }
    });
    write.current = job.then(
      () => undefined,
      () => undefined,
    );
    await job;
  }, []);

  const keep = useCallback(
    (input: KeepInput): Promise<"saved" | "exists"> => {
      const run = keepGate.current.then(async (): Promise<"saved" | "exists"> => {
        if (!/^https?:\/\//i.test(input.url)) {
          throw new Error("Could not keep this file.");
        }
        if (itemsRef.current.some((item) => item.sourceUrl === input.url)) return "exists";

        const nonce = Math.random().toString(36).slice(2, 8);
        const id = `${Date.now()}-${nonce}-${safeFileName(input.filename)}`;
        let bytes: number | null = null;
        try {
          const file = await File.downloadFileAsync(input.url, savedFile(id, input.board), { idempotent: true });
          bytes = Number.isFinite(file.size) ? file.size : null;
        } catch {
          dropFile(id, input.board);
          throw new Error("Could not keep this file.");
        }

        if (itemsRef.current.some((item) => item.sourceUrl === input.url)) {
          dropFile(id, input.board);
          return "exists";
        }

        const record: SavedMedia = {
          id,
          filename: id,
          originalName: input.originalName,
          kind: input.kind,
          board: input.board,
          postNo: input.postNo,
          sourceUrl: input.url,
          savedAt: Date.now(),
          bytes,
        };
        await commit([record, ...itemsRef.current]);
        return "saved";
      });
      keepGate.current = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    [commit],
  );

  const remove = useCallback(
    async (id: string) => {
      const current = itemsRef.current.find((item) => item.id === id);
      dropFile(id, current?.board);
      await commit(itemsRef.current.filter((item) => item.id !== id));
    },
    [commit],
  );

  const share = useCallback(async (item: SavedMedia) => {
    const file = savedFile(item.filename, item.board);
    if (!file.exists) {
      Alert.alert("Media", "This file is no longer on the device.");
      return;
    }
    try {
      await Share.share({ url: file.uri });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/did not share|cancel/i.test(message)) return;
      Alert.alert("Share", "Could not share this file.");
    }
  }, []);

  const value = useMemo(
    () => ({ ready, items, keep, remove, share }),
    [ready, items, keep, remove, share],
  );

  return <SavedMediaContext.Provider value={value}>{children}</SavedMediaContext.Provider>;
}

export function useSavedMedia(): SavedMediaContextValue {
  const value = useContext(SavedMediaContext);
  if (!value) throw new Error("useSavedMedia must be used inside SavedMediaProvider.");
  return value;
}
