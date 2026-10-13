/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Wand Digital brand (shop.wanddigital.com); day-to-day UI uses Tailwind `sky`
        brand: {
          DEFAULT: '#00adf0',
          dark: '#0088bd',
          light: '#8ed9f8',
          navy: '#002e5e',
          // wanddigital.com shop button (--color-magenta / -hover); light = logo magenta
          magenta: '#c42ec4',
          'magenta-dark': '#a626a6',
          'magenta-light': '#dd37dd',
        },
        gray: {
          750: '#2d3748',
          850: '#1a202e',
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};