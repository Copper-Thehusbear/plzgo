/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        bg:      '#1B2B4B',
        surface: '#243759',
        raised:  '#2D4470',
        navy:    '#1B2B4B',
        golden:  '#F4A261',
        rim:     'rgba(255,255,255,0.08)',
        'ios-red':   '#FF3B30',
        'ios-green': '#34C759',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      letterSpacing: {
        tight2: '-0.02em',
        tight4: '-0.04em',
      },
      boxShadow: {
        card:   '0 16px 48px rgba(0,0,0,0.5)',
        button: '0 4px 16px rgba(0,0,0,0.4)',
        golden: '0 8px 32px rgba(244,162,97,0.35)',
      },
    }
  },
  plugins: []
}
