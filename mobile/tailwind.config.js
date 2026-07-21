/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: "#2563EB",
        "primary-fg": "#FFFFFF",
        indigo: "#4F46E5",
        violet: "#7C3AED",
        // Vibrant semantic accents
        emerald: "#10B981",
        amber: "#F59E0B",
        rose: "#F43F5E",
        sky: "#0EA5E9",
        "accent-violet": "#8B5CF6",
        // Warm neutrals
        canvas: "#FAFAF8",
        surface: "#FFFFFF",
        "surface-alt": "#F5F5F4",
        ink: "#1C1917",
        "ink-soft": "#44403C",
        "ink-muted": "#78716C",
        hairline: "#E7E5E4",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
