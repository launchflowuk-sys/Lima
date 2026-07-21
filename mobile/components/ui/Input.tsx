import { useState } from "react";
import { Text, TextInput, type TextInputProps } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label: string;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Labelled text field with an animated focus ring (border + subtle glow). */
export function Input({ label, style, onFocus, onBlur, ...rest }: InputProps) {
  const focus = useSharedValue(0);
  const [focused, setFocused] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.hairline, colors.primary]),
    shadowOpacity: focus.value * 0.18,
  }));

  return (
    <>
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.inkSoft, marginBottom: 6 }}>{label}</Text>
      <AnimatedTextInput
        {...rest}
        placeholderTextColor={colors.inkMuted}
        onFocus={(e) => {
          setFocused(true);
          focus.value = withTiming(1, { duration: 160 });
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          focus.value = withTiming(0, { duration: 160 });
          onBlur?.(e);
        }}
        style={[
          {
            borderWidth: 1.5,
            borderRadius: radius.md,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 16,
            color: colors.ink,
            backgroundColor: colors.surface,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
            elevation: focused ? 2 : 0,
          },
          animatedStyle,
          style,
        ]}
      />
    </>
  );
}
