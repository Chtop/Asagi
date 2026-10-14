import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { LibraryProvider, useLibrary } from "@/src/state/LibraryContext";
import { SavedMediaProvider, useSavedMedia } from "@/src/state/SavedMediaContext";
import { SettingsProvider, useAppTheme } from "@/src/state/SettingsContext";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SettingsProvider>
      <LibraryProvider>
        <SavedMediaProvider>
          <RootGate />
        </SavedMediaProvider>
      </LibraryProvider>
    </SettingsProvider>
  );
}

function RootGate() {
  const { ready: settingsReady, palette, dark } = useAppTheme();
  const { ready: libraryReady } = useLibrary();
  const { ready: savedReady } = useSavedMedia();
  const ready = settingsReady && libraryReady && savedReady;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.background,
      card: palette.header,
      text: palette.text,
      border: palette.border,
      notification: palette.nsfw,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.header },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: "600" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="gallery"
          options={{
            headerShown: false,
            gestureEnabled: true,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: "#000" },
          }}
        />
        <Stack.Screen
          name="quotes/[level]"
          getId={({ params }) => {
            const value = (params as { level?: string | string[] } | undefined)?.level;
            return Array.isArray(value) ? (value[0] ?? "0") : (value ?? "0");
          }}
          options={{
            headerShown: false,
            gestureEnabled: true,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: palette.background },
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
