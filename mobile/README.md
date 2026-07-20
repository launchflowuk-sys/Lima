# LaunchFlow Inbox — Mobile (Expo)

Native iOS/Android client for the LaunchFlow Inbox Agent. Talks to the web app's `/api/v1` JSON API
with bearer-token auth. Expo Router + TypeScript.

## Run locally (Expo Go)
```bash
npm install
# point the app at your running API. For a phone on the same Wi-Fi, use your PC's LAN IP, e.g.:
#   set apiUrl in app.json -> expo.extra.apiUrl to "http://192.168.1.x:3000"
# (localhost only works in the iOS simulator / Android emulator)
npx expo start        # scan the QR with Expo Go
```

## What's here
- `app/` — Expo Router screens: `login`, `(app)/inbox`, `(app)/approvals`, `thread/[id]`
- `lib/api.ts` — typed API client · `lib/token.ts` — secure token store (Keychain/Keystore) · `lib/auth.tsx` — auth context

## Ship to the stores (EAS)
Prereqs (see the repo's `docs/provider-setup.md` / BUILD_PROGRESS for the full checklist):
- `npx expo login` (or `EXPO_TOKEN` env)
- Apple Developer + App Store Connect API key (TestFlight); Google Play Developer + service-account JSON (Play)

```bash
npx eas init                      # links this app to your Expo project
npx eas build --profile preview   # internal build to test on a device
npx eas build --profile production --platform ios     # then: npx eas submit --platform ios   (TestFlight)
npx eas build --profile production --platform android # then: npx eas submit --platform android (Play internal)
```

Bundle id / package: `com.launchflow.inbox` (edit in `app.json`).
