import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { darkColors, lightColors, type Palette } from "@/constants/theme";

export type ColorScheme = "light" | "dark";

interface ThemeState {
  scheme: ColorScheme;
  colors: Palette;
  setScheme: (scheme: ColorScheme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | undefined>(undefined);

/**
 * App theme provider. Defaults to light (per the product default) but can flip
 * to dark — the palettes are symmetrical, so every screen recolours for free.
 */
export function ThemeProvider({
  children,
  initialScheme = "light",
}: {
  children: ReactNode;
  initialScheme?: ColorScheme;
}) {
  const [scheme, setScheme] = useState<ColorScheme>(initialScheme);

  const value = useMemo<ThemeState>(
    () => ({
      scheme,
      colors: scheme === "dark" ? darkColors : lightColors,
      setScheme,
      toggle: () => setScheme((s) => (s === "dark" ? "light" : "dark")),
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Convenience: the active palette. */
export function useColors(): Palette {
  return useTheme().colors;
}
