# Casos de prueba del AutSystem (evidencia para el reporte)

Todos estos casos se ejecutaron contra PostgreSQL real, el backend y el front en producción (`npm run build` + `npm start`).
Usuarios de prueba: contraseña `Nuve2026!` (ver README raíz).

| # | Caso | Resultado esperado | Cómo probarlo |
|---|---|---|---|
| 1 | Ver catálogo sin sesión | Se muestra | Abrir `/` |
| 2 | Registro de cliente nuevo | Sesión iniciada, rol CLIENTE | `/registro` |
| 3 | Correo ya registrado / contraseña < 8 caracteres | Mensaje de error | `/registro` |
| 4 | Login con contraseña incorrecta | "Correo o contraseña incorrectos." (genérico) | `/login` |
| 5 | Login correcto por rol | Admin → `/admin`, operador → `/operador`, cliente → `/` | `/login` |
| 6 | Cookies de sesión | `nuve_access` y `nuve_refresh` con **HttpOnly** | DevTools → Application → Cookies |
| 7 | Entrar a `/mi-cuenta`, `/checkout` sin sesión | Redirige a `/login?next=...` y, al entrar, regresa a esa ruta | Abrir la URL |
| 8 | Cliente entra a `/admin` o `/operador` | 403 "Sin permiso" | Login como valeria, abrir URL |
| 9 | Operador entra a `/admin` | 403; sí puede entrar a `/operador` | Login como operador |
| 10 | Operador intenta eliminar producto (API) | `FORBIDDEN` | Sandbox: `eliminarProducto` con token de operador |
| 11 | Admin cambia rol / desactiva cuenta | Se aplica; no puede cambiarse su propio rol | `/admin` |
| 12 | Cuenta desactivada intenta iniciar sesión | Rechazada; sus refresh tokens se revocan | `/admin` → Desactivar → login |
| 13 | **Access token expirado** | La página sigue funcionando: el middleware lo renueva con el refresh token y actualiza cookies | DevTools: borrar solo la cookie `nuve_access` y recargar `/mi-cuenta` |
| 14 | Refresh token inválido | Se borra la sesión y redirige a `/login` | Cambiar el valor de `nuve_refresh` y recargar |
| 15 | **Reuso de refresh token** (posible robo) | Tras la ventana de 10 s se revocan todas las sesiones del usuario | Sandbox: `refrescarToken` dos veces con el mismo token (esperar 11 s entre ambas) |
| 16 | Logout | Refresh token revocado, cookies y carrito borrados | Botón "Salir" |
| 17 | Cliente A lee el pedido de cliente B | "Ese registro no es tuyo." | Sandbox: `pedido(id)` con token de otro cliente |
| 18 | Cliente manda `usuarioId` ajeno al crear dirección/pedido | Se guarda a nombre del cliente logueado | Sandbox: `crearDireccion(datos:{usuarioId:"1",...})` con token de Karla |
| 19 | Pedido con dirección de otro usuario | Rechazado | `crearPedido` con `direccionId:"1"` como Karla |
| 20 | Pedido con cantidad ≤ 0 o mayor al stock | Rechazado; el stock no cambia | `/api/checkout` o Sandbox |
| 21 | Compra y cancelación | Compra descuenta stock; cancelar (solo PENDIENTE) lo devuelve | `/checkout` → `/mi-cuenta` → Cancelar |
| 22 | Consultar `password` de un usuario | Error de validación: el campo no existe | Sandbox: `{ usuarios { password } }` |
| 23 | POST de formulario desde otro origen | 403 (protección CSRF de Astro + cookies SameSite) | `curl -H "Origin: http://evil.com" -X POST -d "a=b" http://localhost:5173/api/auth/login` |
| 24 | `?next=https://sitio-malo.com` en el login | Se ignora; redirige por rol | `/login?next=https://malo.com` |
