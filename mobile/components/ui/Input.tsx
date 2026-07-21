import { useState } from "react";
import { Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { colors, font, radius } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Feather.glyphMap;
  containerStyle?: ViewStyle;
}

/** Rounded input with an animated focus ring. */
export function Input({ label, icon, containerStyle, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.lineStrong, colors.primary]),
  }));

  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          style={{
            fontFamily: font.semibold,
            fontSize: 13,
            color: colors.inkSoft,
            marginBottom: 8,
            marginLeft: 2,
          }}
        >
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1.5,
            paddingHorizontal: 14,
            height: 54,
          },
          borderStyle,
        ]}
      >
        {icon ? (
          <Feather name={icon} size={18} color={focused ? colors.primary : colors.inkMuted} />
        ) : null}
        <TextInput
          placeholderTextColor={colors.inkMuted}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            focus.value = withTiming(1, { duration: 160 });
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.value = withTiming(0, { duration: 160 });
            props.onBlur?.(e);
          }}
          style={[
            { flex: 1, fontFamily: font.medium, fontSize: 16, color: colors.ink, height: "100%" },
            style,
          ]}
        />
      </Animated.View>
    </View>
  );
}
