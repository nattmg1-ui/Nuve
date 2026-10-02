// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';

// output: 'server' sigue igual (el login necesita servidor). El adaptador
// cambia porque ahora corre como funciones de Netlify, no como un servidor
// Node propio.
export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  server: { port: 5173 },
});