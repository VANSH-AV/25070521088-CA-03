import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = globalThis.process?.env?.VITE_API_PROXY || 'http://127.0.0.1:5050';

const proxy = {
  '/api': {
    target: proxyTarget,
    changeOrigin: false,
    configure(instance) {
      instance.on('error', (error, req, res) => {
        console.error(
          `[vite] API proxy could not reach ${proxyTarget} for ${req?.url || 'unknown path'}: ${error.message}. Is the backend running?`,
        );

        if (!res || res.headersSent || typeof res.writeHead !== 'function') {
          res?.destroy?.();
          return;
        }

        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            success: false,
            error: {
              code: 'UPSTREAM_UNAVAILABLE',
              message:
                'The FLEXI server is unavailable. Check that the backend is running and try again.',
            },
          }),
        );
      });
    },
  },
};

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
});
