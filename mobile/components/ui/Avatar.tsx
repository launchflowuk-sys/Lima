import { Text, View } from "react-native";
import { avatarColor, font, initials } from "@/constants/theme";

interface AvatarProps {
  name: string | null | undefined;
  size?: number;
}

/** Circular initials avatar with a deterministic colour derived from the name. */
export function Avatar({ name, size = 48 }: AvatarProps) {
  const bg = avatarColor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontFamily: font.bold, fontSize: size * 0.36 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
