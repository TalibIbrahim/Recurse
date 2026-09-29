import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Publishes /extension-version.json from extension/manifest.json so the
// extension popup can tell users when a newer version is available.
function extensionVersionFile(): Plugin {
  return {
    name: 'recurse-extension-version',
    generateBundle() {
      const manifest = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, 'extension/manifest.json'), 'utf8')
      );
      this.emitFile({
        type: 'asset',
        fileName: 'extension-version.json',
        source: JSON.stringify({ version: manifest.version }),
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), extensionVersionFile()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-framer': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
