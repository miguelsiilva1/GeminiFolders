import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// Demo page for README screenshots (not part of the extension build).
export default defineConfig({
  root: import.meta.dirname,
  plugins: [preact()],
  server: { port: 5199, strictPort: true },
  build: { target: 'es2022' },
});
