/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        // Identité 5PennyAi
        primary: {
          DEFAULT: '#4f46e5', // Indigo 600
          hover: '#4338ca',   // Indigo 700
          light: '#e0e7ff',   // Indigo 100
        },
        // Surfaces et Fonds
        surface: {
          DEFAULT: '#ffffff', // White
          ground: '#f8fafc',  // Slate 50
        },
        // Typographie
        content: {
          main: '#0f172a',    // Slate 900
          sub: '#64748b',     // Slate 500
        },
        // Bordures
        border: {
          DEFAULT: '#e2e8f0', // Slate 200
        },
        // Sémantique (SEO Status)
        seo: {
          low: {
            text: '#059669',  // Emerald 600
            bg: '#ecfdf5',    // Emerald 50
          },
          medium: {
            text: '#f59e0b',  // Amber 500
            bg: '#fffbeb',    // Amber 50
          },
          high: {
            text: '#e11d48',  // Rose 600
            bg: '#fff1f2',    // Rose 50
          }
        }
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}