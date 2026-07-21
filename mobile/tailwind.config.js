/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: "#2563EB",
          dark: "#1D4ED8",
          light: "#3B82F6",
          soft: "#EFF6FF",
        },
        // Surfaces
        canvas: "#F5F7FA",
        surface: "#FFFFFF",
        // Ink / text
        ink: {
          DEFAULT: "#0F172A",
          soft: "#475569",
          muted: "#94A3B8",
        },
        line: "#EDF1F6",
        // Accents / status
        emerald: "#10B981",
        amber: "#F59E0B",
        rose: "#F43F5E",
        violet: "#8B5CF6",
        sky: "#0EA5E9",
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
        extrabold: ["Inter_800ExtraBold"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
    },
  },
  plugins: [],
};
