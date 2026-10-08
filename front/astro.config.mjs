// @ts-check
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';

// output: 'server' sigue igual (el login necesita servidor). El adaptador
// cambia porque ahora corre como funciones de Netlify, no como un servidor
// Node propio.
export default defineConfig({
  output: 'server',
  // edgeFunctions: false -> en local no intenta levantar las Edge Functions
  // de Netlify (necesitan Deno y el proyecto no las usa). En Netlify no cambia nada.
  // images y environmentVariables se quedan con su valor de siempre.
  adapter: netlify({
    devFeatures: {
      images: true,
      environmentVariables: false,
      edgeFunctions: false,
    },
  }),
  integrations: [react()],
  server: { port: 5173 },
});