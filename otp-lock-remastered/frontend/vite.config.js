import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact({
    devToolsEnabled: false,
    prefreshEnabled: false,
    reactAliasesEnabled: false,
  })],
  server: {
    hmr: {
      overlay: false
    }
  }
});
