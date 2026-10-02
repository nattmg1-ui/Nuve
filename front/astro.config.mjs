// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

// output: 'server' -> las páginas se generan en cada petición (SSR).
// Es necesario para el login: hay que leer cookies y validar la sesión en el servidor.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: { port: 5173 },
});
