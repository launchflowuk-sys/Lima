import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

interface ScreenProps {
  children: ReactNode;
  /** Which safe-area edges to pad. Default top + horizontal (bottom handled by tab bar). */
  edges?: Edge[];
  style?: ViewStyle;
  background?: string;
}

/** Base light canvas for every screen. */
export function Screen({ children, edges = ["top"], style, background }: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: background ?? colors.canvas }}
    >
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </SafeAreaView>
  );
}
