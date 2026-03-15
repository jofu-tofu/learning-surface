import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import httpProxy from 'http-proxy';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: 'ws-proxy',
      configureServer(server) {
        const proxy = httpProxy.createProxyServer({ target: 'ws://localhost:8081', ws: true });
        proxy.on('error', () => {}); // suppress proxy errors when backend is down
        server.httpServer?.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
          // Let Vite handle its own HMR WebSocket
          if (req.headers['sec-websocket-protocol']?.includes('vite-hmr')) return;
          proxy.ws(req, socket, head);
        });
      },
    },
  ],
  build: {
    outDir: 'dist/client',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
