import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      colors: {
        surface: "var(--surface)",
        ink: "var(--ink)",
        mute: "var(--mute)",
        accent: {
          DEFAULT: "var(--accent)",
          50: "var(--accent-50)",
          100: "var(--accent-100)",
          200: "var(--accent-200)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          800: "var(--accent-800)",
        },
        primary: "var(--primary)",
        neutral: {
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
        },
        /* Semantic: use for success/error/warning UI only */
        success: {
          50: "var(--success-50)",
          600: "var(--success-600)",
          700: "var(--success-700)",
          800: "var(--success-800)",
        },
        warning: {
          50: "var(--warning-50)",
          600: "var(--warning-600)",
          700: "var(--warning-700)",
        },
        error: {
          50: "var(--error-50)",
          200: "var(--error-200)",
          600: "var(--error-600)",
          700: "var(--error-700)",
          800: "var(--error-800)",
        },
      },
      fontSize: {
        display: ["var(--text-display)", { lineHeight: "var(--leading-tight)" }],
        heading: ["var(--text-heading)", { lineHeight: "var(--leading-snug)" }],
        title: ["var(--text-title)", { lineHeight: "var(--leading-snug)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-relaxed)" }],
        "body-sm": ["var(--text-body-sm)", { lineHeight: "var(--leading-relaxed)" }],
        caption: ["var(--text-caption)", { lineHeight: "var(--leading-normal)" }],
        overline: ["var(--text-overline)", { lineHeight: "var(--leading-normal)" }],
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
        "3xl": "var(--space-3xl)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        document: "var(--shadow-document)",
        "document-hover": "var(--shadow-document-hover)",
      },
    },
  },
  plugins: [],
};

export default config;
