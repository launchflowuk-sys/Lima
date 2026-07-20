import * as SecureStore from "expo-secure-store";

// The bearer token from POST /api/v1/auth/login, kept in the device secure store (Keychain /
// Keystore) — never in plain AsyncStorage.
const KEY = "lima_session_token";

export function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}
export function setToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(KEY, token);
}
export function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(KEY);
}
