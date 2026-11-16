import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base نسبي: يشتغل على GitHub Pages (/fryday-menu/) وعلى Cloudflare (/) بدون تغيير
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: true },
});
