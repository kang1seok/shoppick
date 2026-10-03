import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "color-mix(in oklch, var(--background) calc(<alpha-value> * 100%), transparent)",
        foreground: "color-mix(in oklch, var(--foreground) calc(<alpha-value> * 100%), transparent)",
        card: {
          DEFAULT: "color-mix(in oklch, var(--card) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklch, var(--card-foreground) calc(<alpha-value> * 100%), transparent)",
        },
        popover: {
          DEFAULT: "color-mix(in oklch, var(--popover) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklch, var(--popover-foreground) calc(<alpha-value> * 100%), transparent)",
        },
        primary: {
          DEFAULT: "color-mix(in oklch, var(--primary) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklch, var(--primary-foreground) calc(<alpha-value> * 100%), transparent)",
        },
        secondary: {
          DEFAULT: "color-mix(in oklch, var(--secondary) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklch, var(--secondary-foreground) calc(<alpha-value> * 100%), transparent)",
        },
        muted: {
          DEFAULT: "color-mix(in oklch, var(--muted) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklch, var(--muted-foreground) calc(<alpha-value> * 100%), transparent)",
        },
        accent: {
          DEFAULT: "color-mix(in oklch, var(--accent) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklch, var(--accent-foreground) calc(<alpha-value> * 100%), transparent)",
        },
        destructive: {
          DEFAULT: "color-mix(in oklch, var(--destructive) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in oklch, var(--destructive-foreground) calc(<alpha-value> * 100%), transparent)",
        },
        border: "color-mix(in oklch, var(--border) calc(<alpha-value> * 100%), transparent)",
        input: "color-mix(in oklch, var(--input) calc(<alpha-value> * 100%), transparent)",
        ring: "color-mix(in oklch, var(--ring) calc(<alpha-value> * 100%), transparent)",
        chart: {
          "1": "color-mix(in oklch, var(--chart-1) calc(<alpha-value> * 100%), transparent)",
          "2": "color-mix(in oklch, var(--chart-2) calc(<alpha-value> * 100%), transparent)",
          "3": "color-mix(in oklch, var(--chart-3) calc(<alpha-value> * 100%), transparent)",
          "4": "color-mix(in oklch, var(--chart-4) calc(<alpha-value> * 100%), transparent)",
          "5": "color-mix(in oklch, var(--chart-5) calc(<alpha-value> * 100%), transparent)",
        },
      },
      borderRadius: {
        lg: "color-mix(in oklch, var(--radius) calc(<alpha-value> * 100%), transparent)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["color-mix(in oklch, var(--font-noto-sans-kr) calc(<alpha-value> * 100%), transparent)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
