import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // TEMP: bump mobile breakpoint for desktop debugging.
    // Default sm=640. Restore by removing this override.
    screens: {
      sm: "1100px",
      md: "1100px",
      lg: "1280px",
      xl: "1536px",
      "2xl": "1700px",
    },
    extend: {
      colors: {
        bg: "#0a0a0f",
        surface: "#13131a",
        surface2: "#1c1c26",
        line: "#262633",
        ink: "#f4f4f5",
        mute: "#8b8b9a",
        accent: "#a78bfa",
        accent2: "#22d3ee",
        success: "#34d399",
        danger: "#fb7185",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(167,139,250,0.25), 0 12px 40px -12px rgba(167,139,250,0.45)",
      },
      backgroundImage: {
        "grid": "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite linear",
      },
    },
  },
} satisfies Config;
