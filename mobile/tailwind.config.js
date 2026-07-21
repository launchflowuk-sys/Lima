/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Ground (light)
        bg: "#F3F2F2",
        surface: "#EAE9E9",
        "surface-alt": "#E2E1E1",
        text: "#201E1D",
        // Primary (MAIN — blue)
        primary: "#2563EB",
        "primary-strong": "#1D4ED8",
        "primary-tint": "#EAF0FE",
        "primary-fg": "#FFFFFF",
        // Danger (contrast accent — red, used sparingly)
        danger: "#EC3013",
        // Semantic
        success: "#1F7A4D",
        warning: "#B45309",
      },
      // Sharp corners everywhere — the whole point of the aesthetic.
      borderRadius: {
        none: "0px",
        sm: "0px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
      },
      fontFamily: {
        sans: ["Archivo_400Regular", "System"],
        medium: ["Archivo_600SemiBold", "System"],
        heading: ["Archivo_800ExtraBold", "System"],
      },
    },
  },
  plugins: [],
};
