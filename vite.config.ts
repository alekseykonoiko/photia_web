import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://photoapp.neuralphotos.ai:19731',
        changeOrigin: true,
        secure: false
      }
    }
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        resolveJsonModule: true
      }
    }
  }
});
