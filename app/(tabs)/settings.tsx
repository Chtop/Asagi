import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { FilterChips, Screen } from "@/src/components/ui";
import { APP_NAME } from "@/src/config";
import { CATALOG_SORT_OPTIONS, CATALOG_VIEW_OPTIONS, SORT_DIRECTION_OPTIONS } from "@/src/lib/catalogSort";
import { cacheByteSize, clearAppCache } from "@/src/lib/disk";
import { formatBytes } from "@/src/lib/format";
import { useLibrary } from "@/src/state/LibraryContext";
import { useAppTheme } from "@/src/state/SettingsContext";
import type { BoardFilter, ThemePreference } from "@/src/storage/model";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "dark", label: "Sombre" },
  { value: "light", label: "Clair" },
  { value: "system", label: "Système" },
];

const FILTERS: { value: BoardFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "sfw", label: "Worksafe" },
  { value: "nsfw", label: "NSFW" },
];

function readCacheSize(): number | null {
  try {
    return cacheByteSize();
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const {
    palette,
    settings,
    setTheme,
    setBoardFilter,
    setCatalogSort,
    setCatalogSortDirection,
    setCatalogView,
  } = useAppTheme();
  const { favorites, history, clearFavorites, clearHistory } = useLibrary();
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCacheBytes(readCacheSize());
    }, []),
  );

  const cacheLabel =
    cacheBytes == null ? "Taille du cache indisponible" : `Cache : ${formatBytes(cacheBytes) ?? "0 o"}`;

  const confirm = (title: string, action: () => Promise<void>) => {
    Alert.alert(title, "Cette action est définitive sur cet appareil.", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: () => void action() },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Thème</Text>
          <FilterChips options={THEMES} value={settings.theme} onChange={setTheme} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Boards affichés</Text>
          <FilterChips options={FILTERS} value={settings.boardFilter} onChange={setBoardFilter} />
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Le même filtre est disponible sur la liste des boards. Worksafe et NSFW viennent du champ ws_board de l'API.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Affichage des threads</Text>
          <Text style={[styles.note, { color: palette.textMuted }]}>Vue par défaut</Text>
          <FilterChips options={CATALOG_VIEW_OPTIONS} value={settings.catalogView} onChange={setCatalogView} />
          <Text style={[styles.note, { color: palette.textMuted }]}>Tri par défaut</Text>
          <FilterChips options={CATALOG_SORT_OPTIONS} value={settings.catalogSort} onChange={setCatalogSort} />
          <Text style={[styles.note, { color: palette.textMuted }]}>Sens par défaut</Text>
          <FilterChips
            options={SORT_DIRECTION_OPTIONS}
            value={settings.catalogSortDirection}
            onChange={setCatalogSortDirection}
          />
          <Text style={[styles.note, { color: palette.textMuted }]}>
            Décroissant met en tête le bump d'origine, le message le plus récent, ou le plus grand nombre. Le tri
            choisi sur un board ne change pas ce réglage. La vue, elle, est mémorisée. L'historique ramène toujours au
            dernier message affiché.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Cache</Text>
          <Text style={[styles.note, { color: palette.textMuted }]}>
            {cacheLabel}. Le vider retire les fichiers temporaires. L'historique, les favoris, le dernier message lu et
            les médias gardés restent.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={clearing}
            onPress={() => {
              Alert.alert(
                "Vider le cache",
                "Les images déjà téléchargées seront retéléchargées. L'historique, les favoris, le dernier message lu et les médias gardés restent.",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Vider",
                    style: "destructive",
                    onPress: () => {
                      setClearing(true);
                      void clearAppCache()
                        .then(() => setCacheBytes(readCacheSize()))
                        .catch(() => Alert.alert("Cache", "Impossible de vider le cache."))
                        .finally(() => setClearing(false));
                    },
                  },
                ],
              );
            }}
            style={[styles.action, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Text style={{ color: palette.text, fontWeight: "600" }}>{clearing ? "Vidage…" : "Vider le cache"}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.heading, { color: palette.text }]}>Sur cet appareil</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirm("Effacer l'historique", clearHistory)}
            style={[styles.action, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Text style={{ color: palette.text, fontWeight: "600" }}>Effacer l'historique ({history.length})</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => confirm("Effacer les favoris", clearFavorites)}
            style={[styles.action, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Text style={{ color: palette.danger, fontWeight: "600" }}>Effacer les favoris ({favorites.length})</Text>
          </Pressable>
        </View>

        <Text style={[styles.note, { color: palette.textMuted }]}>
          {APP_NAME} {version} lit seulement l'API publique a.4cdn.org. Rien n'est envoyé à un serveur à nous. Les favoris
          et l'historique restent dans AsyncStorage, sur l'appareil. L'historique retient le dernier message affiché :
          rouvrir un thread y revient. Effacer l'historique efface ces positions. Les images viennent de i.4cdn.org. Les
          MP4 passent par le lecteur iOS. Les WebM, le format le plus courant, passent par le lecteur embarqué.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24, paddingBottom: 40 },
  section: { gap: 10 },
  heading: { fontSize: 17, fontWeight: "700" },
  note: { fontSize: 13, lineHeight: 19 },
  action: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
