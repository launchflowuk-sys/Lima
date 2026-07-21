import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

/** Global app background — a soft blue → light wash behind every screen. */
export const APP_GRADIENT = ["#D6E4FF", "#EAF1FD", "#F5F8FE"] as const;

interface ScreenProps {
  children: ReactNode;
  /** Which safe-area edges to pad. Default top + horizontal (bottom handled by tab bar). */
  edges?: Edge[];
  style?: ViewStyle;
  /** Pass a solid colour to opt out of the gradient. */
  background?: string;
}

/** Base canvas for every screen — soft blue gradient by default. */
export function Screen({ children, edges = ["top"], style, background }: ScreenProps) {
  return (
    <View style={{ flex: 1 }}>
      {background ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: background }]} />
      ) : (
        <LinearGradient
          colors={APP_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.35, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: "transparent" }}>
        <View style={[{ flex: 1 }, style]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}
