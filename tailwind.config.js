/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'hood-dark': '#060b17',
        'hood-navy': '#09142a',
        'hood-blue': '#0c1b38',
        'hood-blue-card': '#0e2042',
        'hood-blue-border': '#1a3363',
        'hood-green': '#2cb64e',
        'hood-green-hover': '#25a044',
        'hood-green-dark': '#1e8436',
        'hood-green-glow': 'rgba(44, 182, 78, 0.45)',
        'hood-cyan': '#00f0ff',
        'hood-gold': '#f59e0b',
        'hood-purple': '#8b5cf6',
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sub: ['Rajdhani', 'Outfit', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'hood-btn': '0 4px 18px rgba(44, 182, 78, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'hood-btn-hover': '0 6px 24px rgba(44, 182, 78, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        'hood-card': '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(26, 51, 99, 0.5)',
      },
    },
  },
  plugins: [],
};
