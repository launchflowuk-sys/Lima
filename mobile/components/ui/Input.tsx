import { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { fonts } from "@/constants/theme";
import { useColors } from "@/lib/theme";

interface InputProps extends TextInputProps {
  label: string;
}

/**
 * Modernist text field — uppercase micro-label (Archivo, wide tracking),
 * sharp 2px border that turns blue on focus. Flat, no glow.
 */
export function Input({ label, style, onFocus, onBlur, ...rest }: InputProps) {
  const c = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <Text
        style={{
          fontSize: 12,
          fontFamily: fonts.heading,
          letterSpacing: 0.1 * 12,
          textTransform: "uppercase",
          color: c.textSoft,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        {...rest}
        placeholderTextColor={c.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            borderWidth: 2,
            borderRadius: 0,
            borderColor: focused ? c.primary : c.dividerStrong,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 15,
            fontFamily: fonts.body,
            color: c.text,
            backgroundColor: c.surface,
          },
          style,
        ]}
      />
    </View>
  );
}
