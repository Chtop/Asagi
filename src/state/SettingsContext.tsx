import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";

import { loadSettings, saveSettings } from "@/src/storage/persist";
import {
  DEFAULT_SETTINGS,
  type BoardFilter,
  type Settings,
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

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    saveSettings(next).catch(() => {
      // Le réglage reste affiché. Un échec disque est rare sur AsyncStorage.
    });
  }, []);

  const setTheme = useCallback(
    (theme: ThemePreference) => {
      persist({ ...settings, theme });
    },
    [persist, settings],
  );

  const setBoardFilter = useCallback(
    (boardFilter: BoardFilter) => {
      persist({ ...settings, boardFilter });
    },
    [persist, settings],
  );

  const dark = settings.theme === "light" ? false : settings.theme === "dark" ? true : system !== "light";
  const palette = dark ? darkPalette : lightPalette;

  const value = useMemo(
    () => ({ ready, settings, palette, dark, setTheme, setBoardFilter }),
    [ready, settings, palette, dark, setTheme, setBoardFilter],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppTheme(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useAppTheme doit être utilisé dans SettingsProvider.");
  return value;
}
