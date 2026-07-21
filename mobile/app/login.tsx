import { useState } from "react";
import { router } from "expo-router";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { Button, Input, Screen } from "@/components/ui";
import { colors, font } from "@/constants/theme";

export default function Login() {
  const { signIn } = useAuth();
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
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(420)} style={{ marginBottom: 36 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                shadowColor: colors.primary,
                shadowOpacity: 0.2,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 8,
              }}
            >
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 54, height: 54, borderRadius: 16 }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ fontFamily: font.extrabold, fontSize: 32, color: colors.ink, letterSpacing: -0.6 }}>
              Welcome back
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 16, color: colors.inkMuted, marginTop: 6 }}>
              Sign in to your Agent Lima workspace
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(420).delay(100)} style={{ gap: 16 }}>
            <Input
              label="Email"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@business.com"
              returnKeyType="next"
            />
            <Input
              label="Password"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </Animated.View>

          {error ? (
            <Animated.View
              entering={FadeIn}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#FFF1F2",
                borderRadius: 14,
                padding: 12,
                marginTop: 18,
              }}
            >
              <Feather name="alert-circle" size={16} color={colors.rose} />
              <Text style={{ color: colors.rose, fontFamily: font.medium, fontSize: 13.5, flex: 1 }}>
                {error}
              </Text>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.duration(420).delay(200)} style={{ marginTop: 28 }}>
            <Button label="Sign in" icon="arrow-right" onPress={onSubmit} loading={loading} />
          </Animated.View>

          <Text
            style={{
              textAlign: "center",
              color: colors.inkMuted,
              fontFamily: font.regular,
              fontSize: 12.5,
              marginTop: 28,
            }}
          >
            Powered by LaunchFlow
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
