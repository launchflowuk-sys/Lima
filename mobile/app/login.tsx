import { useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "@/lib/auth";

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
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f8fafc" }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a" }}>LaunchFlow Inbox</Text>
      <Text style={{ marginTop: 4, marginBottom: 24, color: "#64748b" }}>Sign in to your workspace</Text>

      <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6 }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={inputStyle}
      />

      <Text style={{ fontSize: 13, fontWeight: "600", color: "#334155", marginTop: 16, marginBottom: 6 }}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={inputStyle} />

      {error ? <Text style={{ color: "#dc2626", marginTop: 12 }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={{ marginTop: 24, backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14, alignItems: "center", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Sign in</Text>}
      </Pressable>
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: "#cbd5e1",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 12,
  fontSize: 16,
  backgroundColor: "#fff",
} as const;
