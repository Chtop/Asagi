import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { SFSymbol } from "sf-symbols-typescript";
import { Text, type ColorValue } from "react-native";

import { useAppTheme } from "@/src/state/SettingsContext";

function TabIcon({ ios, glyph, color }: { ios: SFSymbol; glyph: string; color: ColorValue }) {
  return (
    <SymbolView
      name={{ ios }}
      tintColor={color}
      size={22}
      fallback={<Text style={{ color, fontSize: 12 }}>{glyph}</Text>}
    />
  );
}

export default function TabLayout() {
  const { palette } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.header },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: palette.tabBar,
          borderTopColor: palette.border,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Boards",
          tabBarLabel: "Boards",
          tabBarIcon: ({ color }) => <TabIcon ios="square.grid.2x2" glyph="▦" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color }) => <TabIcon ios="star" glyph="★" color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Media",
          tabBarIcon: ({ color }) => <TabIcon ios="photo" glyph="▣" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => <TabIcon ios="clock" glyph="◷" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabIcon ios="gearshape" glyph="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}
