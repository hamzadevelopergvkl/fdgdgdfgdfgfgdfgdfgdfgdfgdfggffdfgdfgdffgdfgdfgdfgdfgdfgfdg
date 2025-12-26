import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to avoid type issues if @types/node is missing or conflicting
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
    // Define global constants replacement
    define: {
      // Safely stringify the API key, falling back to empty string to prevent undefined behavior
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      // Polyfill process.env to prevent "process is not defined" errors if accessed dynamically
      'process.env': {
        API_KEY: env.API_KEY || ''
      },
      // Global process fallback
      'process': {
        env: {
          API_KEY: env.API_KEY || ''
        }
      }
    },
    server: {
      host: true,
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
          ws: true,
          secure: false,
        }
      }
    }
  };
});