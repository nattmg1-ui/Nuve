// index.js
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './src/schema.js';
import { resolvers } from './src/resolvers.js';
import { verificarAccessToken } from './src/auth/tokens.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  includeStacktraceInErrorResponses: false, // no revelar rutas internas al cliente
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  // Se ejecuta en CADA petición: lee "Authorization: Bearer <accessToken>",
  // valida el JWT y deja { id, rol } en ctx.usuario (o null si no hay sesión).
  context: async ({ req }) => {
    const cabecera = req.headers.authorization || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
    return { usuario: token ? verificarAccessToken(token) : null };
  },
});

console.log(`Servidor GraphQL listo en ${url}`);
