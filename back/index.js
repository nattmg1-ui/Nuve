// index.js
// Servidor GraphQL de Nuvé. Un solo puerto (4000) atiende dos cosas:
//   - HTTP  (Express + Apollo): Query y Mutation, como siempre.
//   - WebSocket (graphql-ws): Subscription, avisos en tiempo real.
//
// Antes se usaba startStandaloneServer, pero ese no soporta WebSocket.
// Por eso ahora se arma el servidor HTTP a mano y se le conecta el WebSocket.

import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { typeDefs } from './src/schema.js';
import { resolvers } from './src/resolvers.js';
import { verificarAccessToken, verificarTicketTiempoReal } from './src/auth/tokens.js';

const PUERTO = Number(process.env.PORT) || 4000;

// El mismo schema (tipos + resolvers) lo usan HTTP y WebSocket
const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const httpServer = http.createServer(app);

// ------------------------------------------------------------------
// WebSocket: Subscriptions
// ------------------------------------------------------------------
// El navegador se conecta a ws://localhost:4000/ y manda { ticket } al conectar.
// El ticket (60 s) lo pidió el servidor de Astro con la sesión del usuario
// (mutation ticketTiempoReal). Si no es válido, se rechaza la conexión.
const wsServer = new WebSocketServer({ server: httpServer, path: '/' });

const servidorWs = useServer(
  {
    schema,
    onConnect: (ctx) => {
      const usuario = verificarTicketTiempoReal(ctx.connectionParams?.ticket);
      if (!usuario) return false; // cierra la conexión: 4403 Forbidden
      ctx.extra.usuario = usuario; // se guarda para todas las suscripciones de esta conexión
      return true;
    },
    // Igual que en HTTP: { usuario } queda en ctx para los resolvers
    context: (ctx) => ({ usuario: ctx.extra.usuario }),
  },
  wsServer
);

// ------------------------------------------------------------------
// HTTP: Query y Mutation
// ------------------------------------------------------------------
const server = new ApolloServer({
  schema,
  includeStacktraceInErrorResponses: false, // no revelar rutas internas al cliente
  plugins: [
    // Al apagar el servidor: termina las peticiones HTTP y cierra los WebSockets
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await servidorWs.dispose();
          },
        };
      },
    },
  ],
});

await server.start();

app.use(
  '/',
  cors(),
  express.json({ limit: '1mb' }),
  expressMiddleware(server, {
    // Se ejecuta en CADA petición: lee "Authorization: Bearer <accessToken>",
    // valida el JWT y deja { id, rol } en ctx.usuario (o null si no hay sesión).
    context: async ({ req }) => {
      const cabecera = req.headers.authorization || '';
      const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
      return { usuario: token ? verificarAccessToken(token) : null };
    },
  })
);

httpServer.listen(PUERTO, () => {
  console.log(`Servidor GraphQL listo en http://localhost:${PUERTO}/`);
  console.log(`Suscripciones (tiempo real) en ws://localhost:${PUERTO}/`);
});