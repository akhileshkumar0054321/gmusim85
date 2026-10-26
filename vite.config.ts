import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import { createAssistantRouter } from './server/assistant';

function assistantAPI(): Plugin {
  const configure = (server: any) => { server.middlewares.use('/api/assistant', createAssistantRouter()); };
  return { name: '8085-assistant-api', configureServer: configure, configurePreviewServer: configure };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), assistantAPI()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
