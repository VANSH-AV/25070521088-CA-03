import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = {
  '/api': {
    target: globalThis.process?.env?.VITE_API_PROXY || 'http://127.0.0.1:5000',
    changeOrigin: false,
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
