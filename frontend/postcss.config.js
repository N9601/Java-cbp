import { fileURLToPath } from 'node:url';

// Resolve the Tailwind config next to this file, so the build works no
// matter which directory the dev server is started from.
export default {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) },
    autoprefixer: {},
  },
};
