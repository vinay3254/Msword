/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        office: {
          blue:   '#2b579a',
          dkblue: '#1e3f73',
          ltblue: '#dce6f7',
        },
      },
    },
  },
  plugins: [],
};
