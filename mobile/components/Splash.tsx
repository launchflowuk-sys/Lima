import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Loader } from "@/components/ui/Loader";
import { APP_GRADIENT } from "@/components/ui/Screen";
import { colors, font } from "@/constants/theme";

/**
 * Branded launch / loading screen. Shows the Agent Lima mark with a smooth
 * entrance and a tasteful loading ring while fonts + auth resolve.
 */
export function Splash() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LinearGradient colors={APP_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 0.35, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View
        entering={FadeInDown.springify().damping(14).stiffness(120)}
        style={{ alignItems: "center" }}
      >
        <View
          style={{
            width: 108,
            height: 108,
            borderRadius: 30,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOpacity: 0.22,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 14 },
            elevation: 10,
          }}
        >
          <Image
            source={require("@/assets/images/icon.png")}
            style={{ width: 84, height: 84, borderRadius: 22 }}
            resizeMode="contain"
          />
        </View>
        <Text
          style={{
            fontFamily: font.extrabold,
            fontSize: 26,
            color: colors.ink,
            marginTop: 22,
            letterSpacing: -0.5,
          }}
        >
          Agent Lima
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: colors.inkMuted, marginTop: 4 }}>
          Your inbox, handled.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(400).duration(500)} style={{ position: "absolute", bottom: 72 }}>
        <Loader size={30} />
      </Animated.View>
    </View>
  );
}
