// src/auth/errores.js
import { GraphQLError } from 'graphql';

const error = (mensaje, code) => new GraphQLError(mensaje, { extensions: { code } });

export const noAutenticado = (m = 'Debes iniciar sesión.') => error(m, 'UNAUTHENTICATED');
export const sinPermiso = (m = 'No tienes permiso para esta operación.') => error(m, 'FORBIDDEN');
export const datosInvalidos = (m) => error(m, 'BAD_USER_INPUT');
