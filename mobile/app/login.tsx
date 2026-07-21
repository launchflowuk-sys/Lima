import { useState } from "react";
import { router } from "expo-router";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/lib/auth";
import { Button, Input } from "@/components/ui";
import { colors, gradients, radius, spacing } from "@/constants/theme";

export default function Login() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/(app)/inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="light" />
      {/* Branded gradient backdrop that fills the top third of the screen. */}
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: spacing.xl, paddingTop: insets.top + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + wordmark */}
          <MotiView
            from={{ opacity: 0, translateY: -12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500 }}
            style={{ alignItems: "center", marginBottom: spacing["2xl"] }}
          >
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                backgroundColor: colors.white,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
                elevation: 8,
              }}
            >
              <Image
                source={require("../assets/images/icon.png")}
                style={{ width: 52, height: 52, borderRadius: 14 }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ color: colors.white, fontSize: 28, fontWeight: "800", marginTop: spacing.lg, letterSpacing: -0.5 }}>
              Agent Lima
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, marginTop: 4 }}>
              Your AI email agent, always on
            </Text>
          </MotiView>

          {/* Sign-in card */}
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500, delay: 120 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius["2xl"],
              padding: spacing.xl,
              shadowColor: "#1C1917",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.1,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.ink }}>Welcome back</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 2, marginBottom: spacing.xl }}>
              Sign in to your workspace
            </Text>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@business.com"
            />

            <View style={{ height: spacing.lg }} />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            {error ? (
              <View
                style={{
                  marginTop: spacing.lg,
                  backgroundColor: "#FFF1F2",
                  borderRadius: radius.md,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: "#BE123C", fontSize: 13, fontWeight: "500" }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ height: spacing.xl }} />

            <Button label="Sign in" onPress={onSubmit} loading={loading} />
          </MotiView>

          <Text style={{ textAlign: "center", color: colors.inkMuted, fontSize: 12, marginTop: spacing.xl }}>
            Powered by LaunchFlow
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
