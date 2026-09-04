import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
  build: {
    // Ensure service worker and manifest are not hashed/renamed
    rollupOptions: {
      output: {
        // Keep public files in place
      },
    },
  },
});
