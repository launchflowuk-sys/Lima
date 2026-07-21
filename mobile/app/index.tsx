import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Splash } from "@/components/Splash";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return <Redirect href={user ? "/(app)/dashboard" : "/login"} />;
}
