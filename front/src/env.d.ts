/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Usuario de la sesión actual (null si no ha iniciado sesión). */
    usuario: import('./lib/types').UsuarioSesion | null;
    /** Access token vigente, para llamar al GraphQL en nombre del usuario. */
    accessToken: string | null;
  }
}
