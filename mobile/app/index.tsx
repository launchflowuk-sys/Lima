import { Redirect } from "expo-router";
import { View } from "react-native";
import { Loader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/lib/theme";

export default function Index() {
  const c = useColors();
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <Loader />
      </View>
    );
  }
  return <Redirect href={user ? "/(app)/inbox" : "/login"} />;
}
