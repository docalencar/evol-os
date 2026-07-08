import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        evol: {
          blue: "#2563EB",
          green: "#16A34A",
          surface: "#F8FAFC"
        }
      },
      borderRadius: {
        card: "12px"
      }
    }
  },
  plugins: []
};

export default config;
