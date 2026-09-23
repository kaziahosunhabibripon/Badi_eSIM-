/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        indigo: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
        // Alias so any `primary-*` utility (used by a few pages) resolves to the same
        // indigo scale instead of silently generating no styles.
        primary: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
        navy: {
          DEFAULT: "#0B1220",
          subtle: "#141C30",
          rail: "#20293F",
        },
        slate: {
          25: "#FAFBFC",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          900: "#0F172A",
        },
        amber: { 50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 600: "#D97706", 700: "#B45309", 800: "#92400E" },
        orange: { 100: "#FFEDD5", 600: "#EA580C", 800: "#9A3412" },
        green: { 100: "#DCFCE7", 600: "#16A34A", 800: "#166534" },
        red: { 100: "#FEE2E2", 600: "#DC2626", 800: "#991B1B" },
      },
      fontSize: {
        display: ["24px", { lineHeight: "32px", fontWeight: "700" }],
        title: ["18px", { lineHeight: "26px", fontWeight: "600" }],
        "body-lg": ["15px", { lineHeight: "24px" }],
        body: ["14px", { lineHeight: "20px" }],
        label: ["13px", { lineHeight: "18px", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(15, 23, 42, 0.04)",
        sm: "0 2px 8px rgba(15, 23, 42, 0.06)",
        md: "0 8px 24px rgba(15, 23, 42, 0.10)",
      },
      spacing: {
        18: "4.5rem",
      },
      keyframes: {
        "fade-slide-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-slide-in": "fade-slide-in 200ms ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
