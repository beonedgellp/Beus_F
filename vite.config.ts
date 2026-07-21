import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks to the backend at VITE_API_URL (default localhost:4000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
