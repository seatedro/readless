const franken = require("franken-ui/shadcn-ui/preset-quick");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
  presets: [franken()],
  safelist: [
    {
      pattern: /^uk-/,
    },
  ],
};
