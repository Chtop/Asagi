import { useRef } from "react";
import { StyleSheet, View } from "react-native";

/**
 * Bande au bord gauche. Une liste horizontale prend le geste de retour iOS,
 * donc ce répondant ferme l'écran quand le doigt part du bord et avance.
 */
export function EdgeBack({ onBack }: { onBack: () => void }) {
  const startX = useRef(0);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.edge}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        startX.current = event.nativeEvent.pageX;
      }}
      onResponderRelease={(event) => {
        if (event.nativeEvent.pageX - startX.current > 60) onBack();
      }}
    />
  );
}

const styles = StyleSheet.create({
  edge: { position: "absolute", left: 0, top: 0, bottom: 0, width: 22, zIndex: 30 },
});
