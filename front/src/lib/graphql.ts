// src/lib/graphql.ts
// Cliente GraphQL que SOLO corre en el servidor de Astro (páginas, middleware y
// endpoints). El navegador nunca habla directo con el backend: así los tokens
// viajan siempre en cookies httpOnly y nunca quedan al alcance de JavaScript.

const URL_BACKEND: string =
  process.env.GRAPHQL_URL ?? (import.meta.env.GRAPHQL_URL as string | undefined) ?? 'http://localhost:4000/';

export class ErrorGraphQL extends Error {
  code: string;
  constructor(mensaje: string, code = 'INTERNAL') {
    super(mensaje);
    this.code = code;
  }
  /** Sesión inválida o expirada (el access/refresh token ya no sirve). */
  get esDeAutenticacion() {
    return this.code === 'UNAUTHENTICATED';
  }
}

export async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  token?: string | null
): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(URL_BACKEND, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new ErrorGraphQL('No se pudo conectar con el servidor. ¿Está corriendo el backend?', 'NETWORK');
  }

  const json = (await respuesta.json()) as {
    data?: T;
    errors?: { message: string; extensions?: { code?: string } }[];
  };

  if (json.errors?.length) {
    throw new ErrorGraphQL(json.errors[0].message, json.errors[0].extensions?.code ?? 'INTERNAL');
  }
  return json.data as T;
}
