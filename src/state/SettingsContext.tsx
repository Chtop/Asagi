import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";

import { loadSettings, saveSettings } from "@/src/storage/persist";
import {
  DEFAULT_SETTINGS,
  type BoardFilter,
  type CatalogSort,
  type CatalogView,
  type Settings,
  type SortDirection,
  type ThemePreference,
} from "@/src/storage/model";
import { darkPalette, lightPalette, type Palette } from "@/src/theme/palette";

type SettingsContextValue = {
  ready: boolean;
  settings: Settings;
  palette: Palette;
  dark: boolean;
  setTheme: (theme: ThemePreference) => void;
  setBoardFilter: (boardFilter: BoardFilter) => void;
  setCatalogSort: (catalogSort: CatalogSort) => void;
  setCatalogSortDirection: (catalogSortDirection: SortDirection) => void;
  setCatalogView: (catalogView: CatalogView) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const system = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((stored) => {
        if (!cancelled) setSettings(stored);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(settings.theme === "system" ? "unspecified" : settings.theme);
  }, [settings.theme]);

  const patch = useCallback((partial: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...partial };
      saveSettings(next).catch(() => {
        // Le réglage reste affiché. Un échec disque est rare sur AsyncStorage.
      });
      return next;
    });
  }, []);

  const setTheme = useCallback((theme: ThemePreference) => patch({ theme }), [patch]);
  const setBoardFilter = useCallback((boardFilter: BoardFilter) => patch({ boardFilter }), [patch]);
  const setCatalogSort = useCallback((catalogSort: CatalogSort) => patch({ catalogSort }), [patch]);
  const setCatalogSortDirection = useCallback(
    (catalogSortDirection: SortDirection) => patch({ catalogSortDirection }),
    [patch],
  );
  const setCatalogView = useCallback((catalogView: CatalogView) => patch({ catalogView }), [patch]);

  const dark = settings.theme === "light" ? false : settings.theme === "dark" ? true : system !== "light";
  const palette = dark ? darkPalette : lightPalette;

  const value = useMemo(
    () => ({
      ready,
      settings,
      palette,
      dark,
      setTheme,
      setBoardFilter,
      setCatalogSort,
      setCatalogSortDirection,
      setCatalogView,
    }),
    [ready, settings, palette, dark, setTheme, setBoardFilter, setCatalogSort, setCatalogSortDirection, setCatalogView],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppTheme(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useAppTheme doit être utilisé dans SettingsProvider.");
  return value;
}
