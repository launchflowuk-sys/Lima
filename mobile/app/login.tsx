import { useState } from "react";
import { router } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/lib/auth";
import { Button, Input, Wordmark } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { useColors } from "@/lib/theme";

export default function Login() {
  const { signIn } = useAuth();
  const c = useColors();
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: spacing.xl,
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wordmark */}
          <View style={{ marginBottom: spacing["2xl"] }}>
            <Wordmark markSize={30} fontSize={20} />
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: c.textMuted,
                marginTop: spacing.md,
                lineHeight: 20,
              }}
            >
              Your AI email agent. Read the enquiry, read Lima's draft, approve on the move.
            </Text>
          </View>

          {/* 2px section rule */}
          <View style={{ height: 2, backgroundColor: c.dividerStrong, marginBottom: spacing.xl }} />

          <Text
            style={{
              fontFamily: fonts.heading,
              fontSize: 10,
              letterSpacing: 0.12 * 10,
              textTransform: "uppercase",
              color: c.primary,
              marginBottom: spacing.md,
            }}
          >
            Sign in
          </Text>

          <View style={{ gap: spacing.lg }}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@business.com"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
          </View>

          {error ? (
            <View
              style={{
                marginTop: spacing.lg,
                borderWidth: 1,
                borderColor: c.danger,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: c.danger, fontSize: 13, fontFamily: fonts.medium }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ height: spacing.xl }} />

          <Button
            label="Sign in"
            onPress={onSubmit}
            loading={loading}
            block
            rightIcon={<Feather name="arrow-right" size={16} color={c.primaryFg} />}
          />

          <Text
            style={{
              textAlign: "left",
              color: c.textMuted,
              fontSize: 11,
              fontFamily: fonts.body,
              marginTop: spacing.xl,
              letterSpacing: 0.02 * 11,
            }}
          >
            Powered by LaunchFlow
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
