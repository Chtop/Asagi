import { Image } from "expo-image";
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ImageViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  if (!uri) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <ScrollView
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          contentContainerStyle={styles.zoom}
        >
          <Image
            source={{ uri }}
            contentFit="contain"
            style={{ width, height: height - insets.top - insets.bottom - 24 }}
          />
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.close, { top: insets.top + 8 }]}
        >
          <Text style={styles.closeText}>Fermer</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000" },
  zoom: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  close: {
    position: "absolute",
    right: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeText: { color: "#fff", fontWeight: "700" },
});
